#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -l <location> [-c <cluster name>] [-d <container registry>]
"
    exit 1
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

# Login to Azure subscription to mitigate a bug to attach ACR
az login

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)
echo "Default subscription ${subscription}"

# Deploy Azure Kubernetes Service
echo "Deploying Azure Kubernetes Service in resource group ${resourceGroupName}"
az aks create --resource-group "${resourceGroupName}" --name "${kubernetesService}" --location "${location}" \
    --attach-acr "${containerRegistry}" \
    --no-ssh-key --enable-managed-identity --enable-addons monitoring,http_application_routing \
    --workspace-resource-id "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${monitorWorkspace}" \
    1>/dev/null

# Grant access to key vault
principalId=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" --query "identity.principalId" -o tsv)
. "${0%/*}/enable-msi-for-key-vault.sh"

echo "Azure Kubernetes Service successfully created."
