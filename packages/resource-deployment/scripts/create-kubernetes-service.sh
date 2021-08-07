#!/bin/bash

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

waitForAppGatewayUpdate() {
    nodeResourceGroup=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" -o tsv --query "nodeResourceGroup")
    if [[ -n ${nodeResourceGroup} ]]; then
        if az network application-gateway show --resource-group "${nodeResourceGroup}" --name "${appGateway}" -o tsv --query "name" >/dev/null 2>&1; then
            echo "Waiting for application gateway configuration update"
            az network application-gateway wait --resource-group "${nodeResourceGroup}" --name "${appGateway}" --updated
        else
            echo "Waiting for application gateway deployment"
            az network application-gateway wait --resource-group "${nodeResourceGroup}" --name "${appGateway}" --created
        fi
    fi
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

# Deploy Azure Kubernetes Service
echo "Deploying Azure Kubernetes Service in resource group ${resourceGroupName}"
az aks create --resource-group "${resourceGroupName}" --name "${kubernetesService}" --location "${location}" \
    --no-ssh-key \
    --enable-managed-identity \
    --network-plugin azure \
    --appgw-name "${appGateway}" \
    --appgw-subnet-cidr "10.2.0.0/16" \
    --enable-addons monitoring,ingress-appgw \
    --workspace-resource-id "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${monitorWorkspace}" \
    --kubernetes-version 1.19.11 \
    1>/dev/null
echo ""

waitForAppGatewayUpdate

principalId=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" --query "identityProfile.kubeletidentity.objectId" -o tsv)

# Grant access to container registry
attachContainerRegistry

# Grant access to key vault
. "${0%/*}/enable-msi-for-key-vault.sh"

echo "Azure Kubernetes Service successfully created."
