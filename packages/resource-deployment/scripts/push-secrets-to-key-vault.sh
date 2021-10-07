#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC2086

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

getLoggedInUserCredentials() {
    echo "Getting logged in user credentials"

    loggedInUserType=$(az account show --query "user.type" -o tsv)
    loggedInServicePrincipalName=$(az account show --query "user.name" -o tsv)

    echo "Logged in user account type: ${loggedInUserType}"
    if [[ -z ${loggedInServicePrincipalName} ]]; then
        echo "Unable to get logged in user service principal id"
        exit 1
    fi
}

grantWritePermissionToKeyVault() {
    echo "Granting write permission to key vault ${keyVault} for logged in user"

    if [[ ${loggedInUserType} == "user" ]]; then
        az keyvault set-policy --name "${keyVault}" --upn "${loggedInServicePrincipalName}" --secret-permissions set 1>/dev/null
    else
        az keyvault set-policy --name "${keyVault}" --spn "${loggedInServicePrincipalName}" --secret-permissions set 1>/dev/null
    fi
}

revokePermissionsToKeyVault() {
    echo "Revoking permission to key vault ${keyVault} for logged in user"

    if [[ ${loggedInUserType} == "user" ]]; then
        az keyvault delete-policy --name "${keyVault}" --upn "${loggedInServicePrincipalName}" 1>/dev/null || true
    else
        az keyvault delete-policy --name "${keyVault}" --spn "${loggedInServicePrincipalName}" 1>/dev/null || true
    fi
}

turnOffKeyVaultFirewall() {
    echo "Disable key vault firewall"
    az keyvault update --name "${keyVault}" --resource-group "${resourceGroupName}" --default-action allow 1>/dev/null
}

deletePrivateEndpointConnection() {
    # Existing private endpoint connections will prevent access to Key Vault from an agent machine
    endpoints=$(az keyvault show --name ${keyVault} --query "properties.privateEndpointConnections[].id" -o tsv)
    for endpoint in ${endpoints}; do
        echo "Deleting private endpoint connection associated with a Key Vault. Id: ${endpoint}"
        az keyvault private-endpoint-connection delete --id ${endpoint} 1>/dev/null
    done
}

pushSecretToKeyVault() {
    local secretName=$1
    local secretValue=$2

    echo "Adding secret for ${secretName} in key vault ${keyVault}"
    az keyvault secret set --vault-name "${keyVault}" --name "${secretName}" --value "${secretValue}" 1>/dev/null
}

getCosmosDbUrl() {
    cosmosDbUrl=$(az cosmosdb show --name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query "documentEndpoint" -o tsv)
    if [[ -z ${cosmosDbUrl} ]]; then
        echo "Unable to get Cosmos DB URL for account ${cosmosDbAccount}"
        exit 1
    fi
}

getStorageAccessKey() {
    storageAccountKey=$(az storage account keys list --account-name "${storageAccount}" --query "[0].value" -o tsv)

    if [[ -z ${storageAccountKey} ]]; then
        echo "Unable to get access key for storage account ${storageAccount}"
        exit 1
    fi
}

getContainerRegistryLogin() {
    # shellcheck disable=SC2154
    containerRegistryUsername=$(az acr credential show --name "${containerRegistry}" --query "username" -o tsv)
    containerRegistryPassword=$(az acr credential show --name "${containerRegistry}" --query "passwords[0].value" -o tsv)

    if [[ -z ${containerRegistryUsername} ]] || [[ -z ${containerRegistryPassword} ]]; then
        echo "Unable to get login for container registry ${containerRegistry}"
        exit 1
    fi
}

createAppInsightsApiKey() {
    echo "Creating App Insights API key"
    apiKeyParams="--app ${appInsights} --resource-group ${resourceGroupName} --api-key ${appInsights}-api-key"
    apiKeyExists=$(az monitor app-insights api-key show ${apiKeyParams})

    # If api key already exists, delete and recreate it
    if [[ -n "${apiKeyExists}" ]]; then
        echo "Deleting existing App Insights API key"
        az monitor app-insights api-key delete ${apiKeyParams} 1>/dev/null
    fi

    appInsightsApiKey=$(az monitor app-insights api-key create ${apiKeyParams} --read-properties ReadTelemetry --query "apiKey" -o tsv)
    echo "App Insights API key successfully created"
}

# function runs in a subshell to isolate trap handler
pushSecretsToKeyVault() (
    echo "Pushing secrets to key vault ${keyVault}"
    getLoggedInUserCredentials

    trap 'revokePermissionsToKeyVault' EXIT
    grantWritePermissionToKeyVault

    turnOffKeyVaultFirewall
    deletePrivateEndpointConnection

    getCosmosDbUrl
    pushSecretToKeyVault "cosmosDbUrl" "${cosmosDbUrl}"

    getStorageAccessKey
    pushSecretToKeyVault "storageAccountName" "${storageAccount}"
    pushSecretToKeyVault "storageAccountKey" "${storageAccountKey}"

    createAppInsightsApiKey
    pushSecretToKeyVault "appInsightsApiKey" "${appInsightsApiKey}"

    getContainerRegistryLogin
    pushSecretToKeyVault "containerRegistryUsername" "${containerRegistryUsername}"
    pushSecretToKeyVault "containerRegistryPassword" "${containerRegistryPassword}"
)

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

pushSecretsToKeyVault
echo "Key vault secrets successfully updated."
