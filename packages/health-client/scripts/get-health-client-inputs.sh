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

exportVariableToPipeline() {
    variableName=$1
    value=$2

    echo "##vso[task.setvariable variable=${variableName};isSecret=false;isOutput=true;]${value}"
}

getPublicDNS() {
    kubernetesService=$(az aks list -g "${resourceGroupName}" --query "[?contains(name,'wiskube')].name" -o tsv)
    nodeResourceGroup=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" -o tsv --query "nodeResourceGroup")
    frontendDns=$(az network public-ip list --resource-group "${nodeResourceGroup}" -o tsv --query "[].dnsSettings.fqdn" -o tsv)

    exportVariableToPipeline "frontendDns" "${frontendDns}"
}

getAuthorityUrl() {
    tenantId=$(az account show --query "tenantId" -o tsv)
    authorityUrl="https://login.microsoftonline.com/${tenantId}"

    exportVariableToPipeline "authorityUrl" "${authorityUrl}"
}

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login 1>/dev/null
fi

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

getPublicDNS
getAuthorityUrl
