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
    principalId=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" --query "identityProfile.kubeletidentity.objectId" -o tsv)
    scope="--scope ${containerRegistryId}"
    . "${0%/*}/role-assign-for-sp.sh"
}

waitForAppGatewayUpdate() {
    currentAppGateway=$(az network application-gateway list --resource-group "${vnetResourceGroup}" --query "[?name=='${appGateway}'].name" -o tsv)
    if [[ -n ${currentAppGateway} ]]; then
        echo "Waiting for application gateway configuration update"
        az network application-gateway wait --resource-group "${vnetResourceGroup}" --name "${appGateway}" --updated
    else
        echo "Waiting for application gateway deployment"
        az network application-gateway wait --resource-group "${vnetResourceGroup}" --name "${appGateway}" --created
    fi
}

grantAccessToAppGateway() {
    echo "Granting access to application gateway"
    az network application-gateway identity assign --gateway-name "${appGateway}" --resource-group "${vnetResourceGroup}" --identity "${appGatewayIdentity}" 1>/dev/null
    identityId=$(az identity show --resource-group "${vnetResourceGroup}" --name "${appGatewayIdentity}" -o tsv --query "principalId")
    az keyvault set-policy --name "${keyVault}" --object-id "${identityId}" --secret-permissions get 1>/dev/null
}

registerPreviewFeature() {
    local feature=$1
    local namespace=$2

    echo "Registering the ${feature} feature flags on a subscription"
    az feature register --namespace "${namespace}" --name "${feature}" 1>/dev/null

    printf " - Registering .."
    local end=$((SECONDS + 1800))
    while [ "${SECONDS}" -le "${end}" ]; do
        state=$(az feature list -o table --query "[?contains(name, '${namespace}/${feature}')].{State:properties.state}" -o tsv)
        if [[ ${state} == "Registered" ]]; then
            break
        else
            printf "."
        fi

        sleep 20
    done
    echo " Registered"

    # Refresh the feature registration (required)
    az provider register --namespace "${namespace}" 1>/dev/null
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

# Enable feature flags on subscription
registerPreviewFeature "EncryptionAtHost" "Microsoft.Compute"
registerPreviewFeature "EnablePodIdentityPreview" "Microsoft.ContainerService"
az extension add --name aks-preview

# Deploy Azure Kubernetes Service
echo "Deploying Azure Kubernetes Service in resource group ${resourceGroupName}"
az aks create --resource-group "${resourceGroupName}" --name "${kubernetesService}" --location "${location}" \
    --no-ssh-key \
    --enable-managed-identity \
    --enable-pod-identity \
    --enable-encryption-at-host \
    --network-plugin azure \
    --appgw-name "${appGateway}" \
    --appgw-subnet-cidr "10.2.0.0/16" \
    --zones 1 2 3 \
    --enable-addons monitoring,ingress-appgw \
    --workspace-resource-id "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${monitorWorkspace}" \
    --kubernetes-version 1.23.3 \
    1>/dev/null
echo ""

# Get the service network configuration
vnetResourceGroup=$(az aks list --resource-group "${resourceGroupName}" --query "[].nodeResourceGroup" -o tsv)

waitForAppGatewayUpdate
attachContainerRegistry
grantAccessToAppGateway

echo "Azure Kubernetes Service successfully created."
