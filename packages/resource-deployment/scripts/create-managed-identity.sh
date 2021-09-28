#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export principalId

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -n <service principal name>
"
    exit 1
}

# Read script arguments
while getopts ":r:n:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    n) principalName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${principalName} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

# Create or update service principal object
echo "Creating managed identity ${principalName}"
principalId=$(az identity create --resource-group "${resourceGroupName}" --name "${principalName}" --query "principalId" -o tsv)

echo "The managed identity ${principalName} successfully created."
