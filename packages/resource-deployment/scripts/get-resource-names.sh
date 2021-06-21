#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

# Read script arguments
while getopts ":r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z "$resourceGroupName" ]]; then
    exitWithUsageInfo
    exit 1
fi

resourceName=$(
    az monitor app-insights component show \
        --resource-group "$resourceGroupName" \
        --query "[?starts_with(name,'wisinsights')].name|[0]" \
        -o tsv
)

if [[ -z $resourceName ]]; then
    echo "Unable to find Application Insights service in resource group $resourceGroupName to infer name suffix"
    return
fi

resourceNameSuffix=${resourceName:11}

kubernetesServiceName="wiskube$resourceNameSuffix"
containerRegistry="wisregistry$resourceNameSuffix"
keyVault="wiskeyvault$resourceNameSuffix"
storageAccount="wisstorage$resourceNameSuffix"
