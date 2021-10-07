#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

templateFile="${0%/*}/../templates/storage-account.template.json"

echo "Creating storage account under resource group '${resourceGroupName}' using ARM template ${templateFile}"
az deployment group create --resource-group "${resourceGroupName}" --template-file "${templateFile}" --query "properties.outputResources[].id" -o tsv 1>/dev/null
echo "Storage account successfully created."
