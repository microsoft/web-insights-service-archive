#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -l <location> [-w <workspace name>]
"
    exit 1
}

# Read script arguments
while getopts ":r:l:w:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    w) monitorWorkspace=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${location} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${monitorWorkspace} ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

echo "Creating Azure Log Analytics workspace ${monitorWorkspace} in resource group ${resourceGroupName}."
az monitor log-analytics workspace create --resource-group "${resourceGroupName}" --workspace-name "${monitorWorkspace}" --location "${location}" 1>/dev/null
echo "Azure Log Analytics workspace successfully created."
