#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-e <environment>]
"
    exit 1
}

createCosmosAccount() {
    echo "Creating Cosmos DB account."
    az deployment group create \
        --resource-group "${resourceGroupName}" \
        --template-file "${0%/*}/../templates/cosmos-db.template.json" \
        --query "properties.outputResources[].id" \
        -o tsv 1>/dev/null

    echo "Cosmos DB account '${cosmosDbAccount}' successfully created."
}

createCosmosCollection() {
    local collectionName=$1
    local dbName=$2
    local ttl=$3
    local throughput=$4

    echo "Checking if collection '${collectionName}' exists in database '${dbName}' of account '${cosmosDbAccount}' in resource group '${resourceGroupName}'"

    if az cosmosdb sql container show --account-name "${cosmosDbAccount}" --database-name "${dbName}" --name "${collectionName}" --resource-group "${resourceGroupName}" --query "id" 2>/dev/null; then
        echo "Collection '${collectionName}' already exists"

        echo "Updating autoscale maximum throughput for collection '${collectionName}'"
        az cosmosdb sql container throughput update \
            --account-name "${cosmosDbAccount}" \
            --database-name "${dbName}" \
            --name "${collectionName}" \
            --resource-group "${resourceGroupName}" \
            --max-throughput "${throughput}" 1>/dev/null

        echo "Updating TTL for collection '${collectionName}'"
        az cosmosdb sql container update \
            --account-name "${cosmosDbAccount}" \
            --database-name "${dbName}" \
            --name "${collectionName}" \
            --resource-group "${resourceGroupName}" \
            --ttl "${ttl}" 1>/dev/null

        echo "Cosmos DB collection '${collectionName}' successfully updated."
    else
        echo "Collection '${collectionName}' does not exist"

        echo "Creating autoscale throughput collection '${collectionName}'"
        az cosmosdb sql container create \
            --account-name "${cosmosDbAccount}" \
            --database-name "${dbName}" \
            --name "${collectionName}" \
            --resource-group "${resourceGroupName}" \
            --partition-key-path "/partitionKey" \
            --max-throughput "${throughput}" \
            --ttl "${ttl}" 1>/dev/null

        echo "Cosmos DB collection '${collectionName}' successfully created."
    fi
}

createCosmosDatabase() {
    local dbName=$1

    echo "Checking if database '${dbName}' exists in Cosmos DB account '${cosmosDbAccount}' in resource group '${resourceGroupName}'"

    if az cosmosdb sql database show --name "${dbName}" --account-name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query "id" 2>/dev/null; then
        echo "Database '${dbName}' already exists"
    else
        echo "Creating Cosmos DB '${dbName}'"
        az cosmosdb sql database create \
            --name "${dbName}" \
            --account-name "${cosmosDbAccount}" \
            --resource-group "${resourceGroupName}" 1>/dev/null
        echo "Cosmos DB '${dbName}' successfully created."
    fi
}

setupCosmosDb() {
    createCosmosAccount

    local webInsightsDbName="WebInsights"
    local cosmosSetupProcesses=(
        "createCosmosDatabase \"${webInsightsDbName}\""
    )

    echo "Creating Cosmos databases in parallel"
    waitForCommandsInParallel cosmosSetupProcesses

    # Increase autoscale maximum throughput for below collection only in case of prod
    # Refer to https://docs.microsoft.com/en-us/azure/cosmos-db/time-to-live for item TTL scenarios
    if [ "${environment}" = "prod" ] || [ "${environment}" = "ppe" ]; then
        cosmosSetupProcesses=(
            "createCosmosCollection \"websiteData\"  \"${webInsightsDbName}\" \"-1\" \"40000\"" # never expire
            "createCosmosCollection \"scanMetadata\" \"${webInsightsDbName}\" \"-1\" \"40000\"" # never expire
        )
    else
        # shellcheck disable=SC2034
        cosmosSetupProcesses=(
            "createCosmosCollection \"websiteData\"  \"${webInsightsDbName}\" \"-1\" \"4000\"" # never expire
            "createCosmosCollection \"scanMetadata\" \"${webInsightsDbName}\" \"-1\" \"4000\"" # never expire
        )
    fi

    echo "Creating Cosmos collections in parallel"
    waitForCommandsInParallel cosmosSetupProcesses
}

createCosmosRBAC() {
    # Create custom RBAC role
    customRoleName="CosmosDocumentRW"
    RBACRoleId=$(az cosmosdb sql role definition list --account-name "${cosmosDbAccount}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].name" -o tsv)

    if [[ -z ${RBACRoleId} ]]; then
        echo "Creating a custom RBAC role with read-write permissions"
        RBACRoleId=$(az cosmosdb sql role definition create --account-name "${cosmosDbAccount}" \
            --resource-group "${resourceGroupName}" \
            --body "@${0%/*}/../templates/cosmos-db-rw-role.json" \
            --query "id" -o tsv)
        az cosmosdb sql role definition wait --account-name "${cosmosDbAccount}" \
            --resource-group "${resourceGroupName}" \
            --id "${RBACRoleId}" \
            --exists 1>/dev/null
    fi
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

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

setupCosmosDb
createCosmosRBAC

echo "Cosmos DB service successfully created."
