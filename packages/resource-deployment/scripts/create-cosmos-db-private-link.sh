#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# Configure Azure Private Link for an Azure Cosmos account
# https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-configure-private-endpoints#create-a-private-endpoint-by-using-azure-cli

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -l <location>
"
    exit 1
}

# Read script arguments
while getopts ":r:l:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

. "${0%/*}/get-resource-names.sh"

echo "Creating private link for Cosmos DB service ${cosmosDbAccount}"
resourceName=${cosmosDbAccount}
resourceId=$(az cosmosdb show --resource-group "${resourceGroupName}" --name "${cosmosDbAccount}" --query "id" -o tsv)
resourceGroupId="sql"
privateLinkResourceId="documents"

. "${0%/*}/create-private-link.sh"
echo "Private link for Cosmos DB service successfully created."
