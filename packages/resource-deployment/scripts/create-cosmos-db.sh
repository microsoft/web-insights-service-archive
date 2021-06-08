#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

set -eo pipefail

export cosmosAccountName
export resourceGroupName

createCosmosAccount() {
    echo "Creating Cosmos DB account..."
    resources=$(
        az deployment group create \
            --resource-group "$resourceGroupName" \
            --template-file "${0%/*}/../templates/cosmos-db.template.json" \
            --query "properties.outputResources[].id" \
            -o tsv
    )

    export resourceName
    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.DocumentDB/databaseAccounts" -r "$resources"
    cosmosAccountName="$resourceName"

    echo "Successfully created Cosmos DB account '$cosmosAccountName'"
}

createCosmosCollection() {
    local collectionName=$1
    local dbName=$2
    local ttl=$3
    local throughput=$4

    echo "Checking if collection '$collectionName' exists in database '$dbName' of account '$cosmosAccountName' in resource group '$resourceGroupName'"

    if az cosmosdb sql container show --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --query "id" 2>/dev/null; then
        echo "Collection '$collectionName' already exists"

        echo "Updating autoscale maximum throughput for collection '$collectionName'"
        az cosmosdb sql container throughput update \
            --account-name "$cosmosAccountName" \
            --database-name "$dbName" \
            --name "$collectionName" \
            --resource-group "$resourceGroupName" \
            --max-throughput "$throughput" 1>/dev/null
        echo "Updating ttl for collection '$collectionName'"
        az cosmosdb sql container update \
            --account-name "$cosmosAccountName" \
            --database-name "$dbName" \
            --name "$collectionName" \
            --resource-group "$resourceGroupName" \
            --ttl "$ttl" 1>/dev/null

        echo "Successfully updated collection '$collectionName'"
    else
        echo "Collection '$collectionName' does not exist"

        echo "Creating autoscale throughput collection '$collectionName'"
        az cosmosdb sql container create \
            --account-name "$cosmosAccountName" \
            --database-name "$dbName" \
            --name "$collectionName" \
            --resource-group "$resourceGroupName" \
            --partition-key-path "/partitionKey" \
            --max-throughput "$throughput" \
            --ttl "$ttl" 1>/dev/null

        echo "Successfully created collection '$collectionName'"
    fi
}

createCosmosDatabase() {
    local dbName=$1

    echo "Checking if database '$dbName' exists in Cosmos account '$cosmosAccountName' in resource group '$resourceGroupName'"

    if az cosmosdb sql database show --name "$dbName" --account-name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "id" 2>/dev/null; then
        echo "Database '$dbName' already exists"
    else
        echo "Creating Cosmos DB '$dbName'"
        az cosmosdb sql database create \
            --name "$dbName" \
            --account-name "$cosmosAccountName" \
            --resource-group "$resourceGroupName" 1>/dev/null
        echo "Successfully created Cosmos DB '$dbName'"
    fi
}

function setupCosmos() {
    createCosmosAccount

    local WebInsightsDbName="WebInsights"

    local cosmosSetupProcesses=(
        "createCosmosDatabase \"$WebInsightsDbName\""
    )
    echo "Creating Cosmos databases in parallel"
    runCommandsWithoutSecretsInParallel cosmosSetupProcesses

    # Increase autoscale maximum throughput for below collection only in case of prod
    # Refer to https://docs.microsoft.com/en-us/azure/cosmos-db/time-to-live for item TTL scenarios
    if [ $environment = "prod" ] || [ $environment = "ppe" ]; then
        cosmosSetupProcesses=(
            "createCosmosCollection \"websiteData\"  \"$WebInsightsDbName\" \"-1\" \"40000\""      # never expire
            "createCosmosCollection \"scanMetadata\" \"$WebInsightsDbName\" \"7776000\" \"40000\"" # 90 days
        )
    else
        cosmosSetupProcesses=(
            "createCosmosCollection \"websiteData\"  \"$WebInsightsDbName\" \"-1\" \"4000\""      # never expire
            "createCosmosCollection \"scanMetadata\" \"$WebInsightsDbName\" \"7776000\" \"4000\"" # 90 days
        )
    fi

    echo "Creating Cosmos collections in parallel"
    runCommandsWithoutSecretsInParallel cosmosSetupProcesses

    echo "Successfully setup Cosmos account."
}

exitWithUsageInfo() {
    echo "Usage: $0 -r <resource group> -e <environment>"
    exit 1
}

# Read script arguments
while getopts ":r:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [ -z $resourceGroupName ] || [ -z $environment ]; then
    exitWithUsageInfo
fi

. "${0%/*}/process-utilities.sh"

setupCosmos
