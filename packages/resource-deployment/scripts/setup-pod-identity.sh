#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export storageApiIdentity

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

enableVMSSAccess() {
    echo "Creating Virtual Machine Contributor role assignment for user-assigned identity ${principalId}"
    nodeResourceGroup=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" -o tsv --query "nodeResourceGroup")
    nodeResourceGroupId="$(az group show -n "${nodeResourceGroup}" -o tsv --query "id")"
    az role assignment create --role "Virtual Machine Contributor" --assignee "${principalId}" --scope "${nodeResourceGroupId}" 1>/dev/null
}

enableCosmosAccess() {
    cosmosAccountId=$(az cosmosdb show --name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query id -o tsv)
    scope="--scope ${cosmosAccountId}"
    role="DocumentDB Account Contributor"
    . "${0%/*}/role-assign-for-sp.sh"
}

enableStorageApiIdentity() {
    echo "Creating a user-assigned identity ${storageApiIdentity}"
    az identity create --resource-group "${resourceGroupName}" --name "${storageApiIdentity}" 1>/dev/null

    principalId="$(az identity show -g "${resourceGroupName}" -n "${storageApiIdentity}" --query "clientId" -o tsv)"
    identityResourceId="$(az identity show -g "${resourceGroupName}" -n "${storageApiIdentity}" --query "id" -o tsv)"

    echo "Successfully created ${storageApiIdentity} with id ${principalId}"
    
    enableVMSSAccess    # Required for all pod identities
    enableCosmosAccess
    . "${0%/*}/enable-msi-for-key-vault.sh"

    echo "Creating pod identity binding"
    bindingSelector="storage-web-api"
    # namespace argument must match the namespace of the service/pod
    az aks pod-identity add --resource-group "${resourceGroupName}" \
        --cluster-name "${kubernetesService}" \
        --namespace "default" \
        --identity-resource-id "${identityResourceId}" \
        --binding-selector "${bindingSelector}" \
        1>/dev/null

    echo "Successfully enabled pod identity ${storageApiIdentity}. Use this identity in a pod by adding label aadpodidbinding=${bindingSelector}"
}

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [ -z "${resourceGroupName}" ]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

enableStorageApiIdentity
