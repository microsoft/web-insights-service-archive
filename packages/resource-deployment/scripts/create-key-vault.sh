#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# Set default ARM template files
createKeyVaultTemplateFile="${0%/*}/../templates/key-vault-create.template.json"
setupKeyVaultResourcesTemplateFile="${0%/*}/../templates/key-vault-setup-resources.template.json"

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-e <environment>]
"
    exit 1
}

recoverIfSoftDeleted() {
    # shellcheck disable=SC2154
    softDeleted=$(az keyvault list-deleted --resource-type vault --query "[?name=='${keyVault}'].id" -o tsv)
    if [[ -n "${softDeleted}" ]]; then
        echo "Key vault ${keyVault} is soft deleted and will be recovered."
        echo "To recreate ${keyVault} without recovery, delete and purge the key vault before running this script."

        az keyvault recover --name "${keyVault}" 1>/dev/null

        echo "Key vault ${keyVault} was successfully recovered."
        keyvaultRecovered=true
    fi
}

createKeyVaultIfNotExists() {
    local existingResourceId
    existingResourceId=$(
        az keyvault list \
            --query "[?name=='${keyVault}'].id|[0]" \
            -o tsv
    )

    if [[ -z ${existingResourceId} ]]; then
        echo "Creating key vault ${keyVault} using ARM template."
        resources=$(
            az deployment group create \
                --resource-group "${resourceGroupName}" \
                --template-file "${createKeyVaultTemplateFile}" \
                --query "properties.outputResources[].id" \
                -o tsv
        )

        echo "Created key vault ${resources}"
    else
        echo "Key vault already exists. Skipping key vault creation using ARM template"
    fi
}

createOrRecoverKeyVault() {
    recoverIfSoftDeleted
    if [[ -z ${keyvaultRecovered} ]]; then
        createKeyVaultIfNotExists
    fi
}

setupKeyVaultResources() {
    echo "Setting up key vault resources using ARM template."
    resources=$(
        az deployment group create \
            --resource-group "${resourceGroupName}" \
            --template-file "${setupKeyVaultResourcesTemplateFile}" \
            --query "properties.outputResources[].id" \
            -o tsv
    )

    echo "Successfully setup key vault resources ${resources}"
}

# Read script arguments
while getopts ":r:e:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${environment} ]]; then
    environment="dev"
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

createOrRecoverKeyVault
setupKeyVaultResources

echo "The key vault successfully created."
