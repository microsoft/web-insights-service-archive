#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -s <subscription name or id>
"
    exit 1
}

# Read script arguments
while getopts ":r:s:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${subscription} ]]; then
    exitWithUsageInfo
    exit 1
fi

echo "Installing microsoft.insights extension for azure-cli"
az extension add -n application-insights 1>/dev/null

echo "Creating Application Insights resource using ARM template"
resources=$(az deployment group create \
    --subscription "${subscription}" \
    --resource-group "${resourceGroupName}" \
    --template-file "${0%/*}/../templates/app-insights.template.json" \
    --query "properties.outputResources[].id" \
    -o tsv)

export resourceName
. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.insights/components" -r "${resources}"
appInsightsName=${resourceName}
echo "Application Insights '${appInsightsName}' successfully created"

appInsightsKey=$(az monitor app-insights component show --app "${appInsightsName}" --resource-group "${resourceGroupName}" --query "instrumentationKey" -o tsv)
echo "App Insights key: '${appInsightsKey}'"
