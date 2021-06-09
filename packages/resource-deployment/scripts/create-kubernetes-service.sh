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
az aks create --resource-group "$resourceGroupName" --name "$kubernetesServiceName" --location "$location" --attach-acr "$containerRegistry" --generate-ssh-keys 1>/dev/null
