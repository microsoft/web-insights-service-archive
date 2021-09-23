#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -l <location> [-c <aks cluster name>] [-d <container registry>]
"
    exit 1
}

attachContainerRegistry() {
    role="AcrPull"
    containerRegistryId=$(az acr show --resource-group "${resourceGroupName}" --name "${containerRegistry}" --query id -o tsv)
    scope="--scope ${containerRegistryId}"
    . "${0%/*}/role-assign-for-sp.sh"
}

enableCosmosRBAC() {
    # Create and assign custom RBAC role
    customRoleName="CosmosDocumentRW"
    RBACRoleId=$(az cosmosdb sql role definition list --account-name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].name" -o tsv)

    if [[ -z ${RBACRoleId} ]]; then
        echo "Creating a custom RBAC role with read-write permissions"
        RBACRoleId=$(az cosmosdb sql role definition create --account-name "${cosmosDbAccount}" \
            --resource-group "${resourceGroupName}" \
            --body "@${0%/*}/../templates/cosmos-db-rw-role.json" \
            --query "id" -o tsv)
        az cosmosdb sql role definition wait --account-name "${cosmosDbAccount}" \
            --resource-group "${resourceGroupName}" \
            --id "${RBACRoleId}" \
            --exists 1>/dev/null
    fi

    echo "Assigning custom RBAC role ${customRoleName} to service principal ${principalId}"
    az cosmosdb sql role assignment create --account-name "${cosmosDbAccount}" \
        --resource-group "${resourceGroupName}" \
        --scope "/" \
        --principal-id "${principalId}" \
        --role-definition-id "${RBACRoleId}" 1>/dev/null
}

waitForAppGatewayUpdate() {
    nodeResourceGroup=$(az aks list --resource-group "${resourceGroupName}" --query "[].nodeResourceGroup" -o tsv)
    if [[ -n ${nodeResourceGroup} ]]; then
        currentAppGateway=$(az network application-gateway list --resource-group "${nodeResourceGroup}" --query "[?name=='${appGateway}'].name" -o tsv)
        if [[ -n ${currentAppGateway} ]]; then
            echo "Waiting for application gateway configuration update"
            az network application-gateway wait --resource-group "${nodeResourceGroup}" --name "${appGateway}" --updated
        else
            echo "Waiting for application gateway deployment"
            az network application-gateway wait --resource-group "${nodeResourceGroup}" --name "${appGateway}" --created
        fi
    fi
}

updateSubnetsProvisioningState() {
    # Subnet may fail deployment with Failed provisioning state. Retrying subnet update will fix provisioning state.
    vnet=$(az network vnet list --resource-group "${nodeResourceGroup}" --query "[].name" -o tsv)
    echo "Validating subnets provisioning state in vnet ${vnet}"

    subnets=$(az network vnet subnet list --resource-group "${nodeResourceGroup}" --vnet-name "${vnet}" --query "[].name" -o tsv)
    for subnet in ${subnets}; do
        provisioningState=$(az network vnet subnet show --resource-group "${nodeResourceGroup}" --vnet-name "${vnet}" --name "${subnet}" --query "provisioningState" -o tsv)
        echo "Subnet ${subnet} provisioning state: ${provisioningState}"

        if [[ ${provisioningState} != "Succeeded" ]]; then
            echo "Updating subnet ${subnet} to recover from ${provisioningState} provisioning state"
            az network vnet subnet update --resource-group "${nodeResourceGroup}" --vnet-name "${vnet}" --name "${subnet}" 1>/dev/null
        fi
    done
}

grantAccessToCluster() {
    echo "Granting access to AKS cluster"
    principalId=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" --query "identityProfile.kubeletidentity.objectId" -o tsv)
    # Grant access to container registry
    attachContainerRegistry
    # Grant access to key vault
    . "${0%/*}/enable-msi-for-key-vault.sh"
    # Grant access to Cosmos DB
    enableCosmosRBAC
}

grantAccessToAppGateway() {
    echo "Granting access to application gateway"
    az network application-gateway identity assign --gateway-name "${appGateway}" --resource-group "${nodeResourceGroup}" --identity "${appGatewayIdentity}" 1>/dev/null
    identityId=$(az identity show --resource-group "${nodeResourceGroup}" --name "${appGatewayIdentity}" -o tsv --query "principalId")
    az keyvault set-policy --name "${keyVault}" --object-id "${identityId}" --secret-permissions get 1>/dev/null
}

grantAccessToCosmosDB() {
    local subnet="aks-subnet"

    vnet=$(az network vnet list --resource-group "${nodeResourceGroup}" --query "[].name" -o tsv)
    echo "Granting CosmosDB access to subnet ${subnet} in vnet ${vnet}"
    nodeSubnetId=$(az network vnet subnet list --resource-group "${nodeResourceGroup}" --vnet-name "${vnet}" --query "[?name=='${subnet}'].id" -o tsv)

    az network vnet subnet update \
        --resource-group "${nodeResourceGroup}" \
        --name "${subnet}" \
        --vnet-name "${vnet}" \
        --service-endpoints Microsoft.AzureCosmosDB 1>/dev/null

    az cosmosdb network-rule add --name "${cosmosDbAccount}" \
        --resource-group "${resourceGroupName}" \
        --virtual-network "${vnet}" \
        --subnet "${nodeSubnetId}" 1>/dev/null
}

registerEncryptionAtHost() {
    echo "Registering the EncryptionAtHost feature flags on subscription"
    az feature register --namespace "Microsoft.Compute" --name "EncryptionAtHost" 1>/dev/null

    printf " - Registering .."
    local end=$((SECONDS + 1800))
    while [ "${SECONDS}" -le "${end}" ]; do
        state=$(az feature list -o table --query "[?contains(name, 'Microsoft.Compute/EncryptionAtHost')].{State:properties.state}" -o tsv)
        if [[ ${state} == "Registered" ]]; then
            break
        else
            printf "."
        fi

        sleep 20
    done
    echo " Registered"

    # Refresh the registration of the Microsoft.Compute resource providers
    az provider register --namespace Microsoft.Compute 1>/dev/null
}

# Read script arguments
while getopts ":r:c:l:d:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    c) kubernetesService=${OPTARG} ;;
    d) containerRegistry=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${location} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${kubernetesService} ]] || [[ -z ${containerRegistry} ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

# Enable the EncryptionAtHost feature flags on subscription
registerEncryptionAtHost

# Deploy Azure Kubernetes Service
echo "Deploying Azure Kubernetes Service in resource group ${resourceGroupName}"
az aks create --resource-group "${resourceGroupName}" --name "${kubernetesService}" --location "${location}" \
    --no-ssh-key \
    --enable-managed-identity \
    --enable-encryption-at-host \
    --network-plugin azure \
    --appgw-name "${appGateway}" \
    --appgw-subnet-cidr "10.2.0.0/16" \
    --zones 1 2 3 \
    --enable-addons monitoring,ingress-appgw \
    --workspace-resource-id "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${monitorWorkspace}" \
    --kubernetes-version 1.19.11 \
    1>/dev/null
echo ""

waitForAppGatewayUpdate
updateSubnetsProvisioningState
grantAccessToCluster
grantAccessToAppGateway
grantAccessToCosmosDB

echo "Azure Kubernetes Service successfully created."
