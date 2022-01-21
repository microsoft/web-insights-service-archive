#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create set of environment variables to use for service local debugging

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <subscription name or id>]
"
    exit 1
}

getCosmosDbUrl() {
    cosmosDbUrl=$(az cosmosdb show --name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query "documentEndpoint" -o tsv)
    if [[ -z ${cosmosDbUrl} ]]; then
        echo "Unable to get Cosmos DB URL for Cosmos DB account ${cosmosDbAccount}"
        exit 1
    fi
}

getCosmosDbAccessKey() {
    cosmosDbAccessKey=$(az cosmosdb keys list --name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query "primaryMasterKey" -o tsv)
    if [[ -z ${cosmosDbAccessKey} ]]; then
        echo "Unable to get access key for Cosmos DB account ${cosmosDbAccount}"
        exit 1
    fi
}

getStorageConnectionString() {
    storageConnectionString=$(az storage account show-connection-string --name "${storageAccount}" --resource-group "${resourceGroupName}" --subscription "${subscription}" --query connectionString --out tsv)
}

getCosmosDbConnectionString() {
    cosmosDbConnectionString=$(az cosmosdb keys list --type connection-strings --name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --subscription "${subscription}" --query connectionStrings[0].connectionString --out tsv)
}

getAppInsightKey() {
    id="/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/microsoft.insights/components/${appInsights}"
    appInsightInstrumentationKey=$(az resource show --id "${id}" --query properties.InstrumentationKey --out tsv)
    appInsightsAppId=$(az resource show --id "${id}" --query properties.AppId --out tsv)
}

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

# Read script arguments
while getopts ":s:r:" option; do
    case ${option} in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${subscription} ]] || [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/create-sp-for-debug.sh"

getCosmosDbUrl
getCosmosDbAccessKey
getStorageConnectionString
getCosmosDbConnectionString
getAppInsightKey

echo -e "
Local debug .env file
START of .env file >>> \033[32m

SUBSCRIPTION=${subscription}
RESOURCE_GROUP=${resourceGroupName}

AZURE_TENANT_ID=${tenant}
AZURE_CLIENT_ID=${clientId}
AZURE_CLIENT_SECRET=${password}

KEY_VAULT_URL=https://${keyVault}.vault.azure.net/
APPINSIGHTS_INSTRUMENTATIONKEY=${appInsightInstrumentationKey}
APPINSIGHTS_APPID=${appInsightsAppId}

COSMOS_DB_URL=${cosmosDbUrl}
COSMOS_DB_KEY=${cosmosDbAccessKey}

AZURE_STORAGE_NAME=${storageAccount}

\033[0m <<< END of .env file

Azure Function local.settings.json configuration file
START of local.settings.json file >>> \033[32m

{
    \"IsEncrypted\": false,
    \"Values\": {
        \"FUNCTIONS_WORKER_RUNTIME\": \"node\",
        \"AzureWebJobsStorage\": \"${storageConnectionString}\",
        \"COSMOS_CONNECTION_STRING\": \"${cosmosDbConnectionString}\"
    }
}

\033[0m <<< END of local.settings.json file
"
