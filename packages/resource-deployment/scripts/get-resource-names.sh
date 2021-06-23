#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z "${resourceGroupName}" ]]; then
    exitWithUsageInfo
    exit 1
fi

resourceName=$(
    az monitor app-insights component show \
        --resource-group "${resourceGroupName}" \
        --query "[?starts_with(name,'wisappinsights')].name|[0]" \
        -o tsv
)

if [[ -z ${resourceName} ]]; then
    echo "Unable to find Application Insights service in resource group ${resourceGroupName} to infer name suffix"
    return
fi

# Remove app insights name prefix
resourceNameSuffix=${resourceName:14}

export kubernetesService="wiskube${resourceNameSuffix}"
export containerRegistry="wisregistry${resourceNameSuffix}"
export keyVault="wiskeyvault${resourceNameSuffix}"
export storageAccount="wisstorage${resourceNameSuffix}"
export cosmosDbAccount="wisscosmosdb${resourceNameSuffix}"
export appInsights="wisappinsights${resourceNameSuffix}"
