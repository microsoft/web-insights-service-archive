#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -p <service principal id> [-c <aks cluster name>]
"
    exit 1
}

grantStorageAccess() {
    subscription=$(az account list --query "[?isDefault==\`true\`].id" -o tsv)
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccount}"

    role="Storage Blob Data Contributor"
    . "${0%/*}/role-assign-for-sp.sh"
}

assignCosmosRBAC() {
    local customRoleName="CosmosDocumentRW"

    echo "Assigning custom RBAC role ${customRoleName} to ${principalId} service principal"
    RBACRoleName=$(az cosmosdb sql role definition list --account-name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].name" -o tsv)
    az cosmosdb sql role assignment create --account-name "${cosmosDbAccount}" \
        --resource-group "${resourceGroupName}" \
        --scope "/" \
        --principal-id "${principalId}" \
        --role-definition-id "${RBACRoleName}" 1>/dev/null
}

createPodIdentity() {
    echo "Creating a pod identity for the ${principalId} service principal"
    identityResourceId=$(az identity list --resource-group "${resourceGroupName}" --query "[?principalId=='${principalId}'].id" -o tsv)
    principalName=$(az identity list --resource-group "${resourceGroupName}" --query "[?principalId=='${principalId}'].name" -o tsv)

    az aks pod-identity add --resource-group "${resourceGroupName}" \
        --cluster-name "${kubernetesService}" \
        --namespace default \
        --name "${principalName}" \
        --identity-resource-id "${identityResourceId}" 1>/dev/null
}

# Read script arguments
while getopts ":r:c:p:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    c) kubernetesService=${OPTARG} ;;
    p) principalId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${principalId} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

createPodIdentity
assignCosmosRBAC
grantStorageAccess
. "${0%/*}/enable-msi-for-key-vault.sh"

echo "The access successfully granted to the ${principalId} service principal."
