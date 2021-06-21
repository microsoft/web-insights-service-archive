#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export dropFolder="${0%/*}/../../../"
export environment
export location
export resourceGroupName
export subscription
export templatesFolder="${0%/*}/../templates/"

exitWithUsageInfo() {
    echo "
Usage: $0 -e <environment> -l <location> -r <resource group> -s <subscription name or id>
where:

resource group - The name of the resource group that everything will be deployed in.
subscription - The subscription for the resource group.
environment - The environment in which the set up is running (dev, ci, ppe, or prod)
location - Azure region where the instances will be deployed. Available Azure regions:
    centralus
    eastasia
    southeastasia
    eastus
    eastus2
    westus
    westus2
    northcentralus
    southcentralus
    westcentralus
    northeurope
    westeurope
    japaneast
    japanwest
    brazilsouth
    australiasoutheast
    australiaeast
    westindia
    southindia
    centralindia
    canadacentral
    canadaeast
    uksouth
    ukwest
    koreacentral
    koreasouth
    francecentral
    southafricanorth
    uaenorth
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function onExit() {
    local exitCode=$?

    if [[ $exitCode != 0 ]]; then
        echo "Installation failed with exit code $exitCode"
        killDescendantProcesses $$
        echo "WARN: Deployments that already were triggered could still be running. To kill them, you may need to goto the Azure portal and cancel corresponding deployment."
    else
        echo "Installation completed with exit code $exitCode"
    fi

    exit $exitCode
}

trap "onExit" EXIT

# Read script arguments
while getopts ":r:s:l:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    l) location=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]] || [[ -z $location ]] || [[ -z $environment ]]; then
    exitWithUsageInfo
fi

function install() {
    # Login to Azure if required
    if ! az account show 1>/dev/null; then
        az login
    fi

    az account set --subscription "$subscription"

    . "${0%/*}/create-resource-group.sh"
    . "${0%/*}/wait-for-pending-deployments.sh"
    . "${0%/*}/create-app-insights.sh"
    . "${0%/*}/get-resource-names.sh"

    # Set of scripts that can be run in parallel without external dependencies
    parallelProcesses=(
        "${0%/*}/create-container-registry.sh"
        "${0%/*}/create-cosmos-db.sh"
        "${0%/*}/create-storage-account.sh"
    )
    runCommandsWithoutSecretsInParallel parallelProcesses

    . "${0%/*}/create-key-vault.sh"
    . "${0%/*}/create-kubernetes-service.sh"
}

install
