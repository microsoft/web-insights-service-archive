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
    --enable-addons monitoring \
    --workspace-resource-id "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${monitorWorkspace}" \
    --kubernetes-version 1.19.11 \
    1>/dev/null

# Enable Application Gateway Ingress Controller addon
az aks enable-addons --resource-group "${resourceGroupName}" --name "${kubernetesService}" \
    --addons ingress-appgw \
    --appgw-name "${appGateway}" \
    --appgw-subnet-cidr "10.2.0.0/16" \
    --workspace-resource-id "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${monitorWorkspace}" \
    1>/dev/null

principalId=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" --query "identityProfile.kubeletidentity.objectId" -o tsv)

# Grant access to container registry
attachContainerRegistry

# Grant access to key vault
. "${0%/*}/enable-msi-for-key-vault.sh"

echo "Azure Kubernetes Service successfully created."
