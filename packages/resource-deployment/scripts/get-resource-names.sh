#!/usr/bin/env bash

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

sourceResourceName=$(
    az monitor app-insights component show \
        --resource-group "${resourceGroupName}" \
        --query "[?starts_with(name,'wisappinsights')].name|[0]" \
        -o tsv
)

if [[ -z ${sourceResourceName} ]]; then
    echo "Unable to find Application Insights service in resource group ${resourceGroupName} to infer name suffix"
    return
fi

# Remove app insights name prefix
export resourceNameSuffix=${sourceResourceName:14}
export frontEndPublicCertificate="front-end-public-ssl"
export kubernetesService="wiskube${resourceNameSuffix}"
export containerRegistry="wisregistry${resourceNameSuffix}"
export keyVault="wiskeyvault${resourceNameSuffix}"
export storageAccount="wisstorage${resourceNameSuffix}"
export cosmosDbAccount="wisscosmosdb${resourceNameSuffix}"
export appInsights="wisappinsights${resourceNameSuffix}"
export monitorWorkspace="wismonitorworkspace${resourceNameSuffix}"
export appGateway="wisappgateway${resourceNameSuffix}"
export appGatewayPublicIP="wisappgateway${resourceNameSuffix}-appgwpip"
export appGatewayPublicDNSPrefix="wisapi${resourceNameSuffix}"
export appGatewayIdentity="ingressapplicationgateway-${kubernetesService}"
