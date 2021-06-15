#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -l <location> -c <cluster name> -d <container registry>
"
    exit 1
}

function attachContainerRegistry() {
    # grant cluster sp access to container registry
    principalId=$(az aks show --resource-group "$resourceGroupName" --name "$kubernetesServiceName" --query "identity.principalId" -o tsv)
    role="acrPull"
    containerRegistryId=$(az acr show --resource-group "$resourceGroupName" --name "$containerRegistry" --query id -o tsv)
    scope="--scope $containerRegistryId"
    . "${0%/*}/role-assign-for-sp.sh"

    az aks update --resource-group "$resourceGroupName" --name "$kubernetesServiceName" --attach-acr "$containerRegistry" 1>/dev/null
}

# Read script arguments
while getopts ":r:c:l:d:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    c) kubernetesServiceName=${OPTARG} ;;
    d) containerRegistry=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $kubernetesServiceName ]] || [[ -z $location ]] || [[ -z $containerRegistry ]]; then
    exitWithUsageInfo
fi

# Deploy Azure Kubernetes Service
echo "Deploying Azure Kubernetes Service in resource group $resourceGroupName"
az aks create --resource-group "$resourceGroupName" --name "$kubernetesServiceName" --location "$location" --enable-managed-identity 1>/dev/null

attachContainerRegistry
