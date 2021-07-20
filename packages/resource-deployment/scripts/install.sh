#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export dropFolder="${0%/*}/../../../"
export templatesFolder="${0%/*}/../templates/"
export environment
export location
export resourceGroupName
export subscription
export releaseVersion

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -e <environment> -l <location> -r <resource group> -s <subscription name or id> [-v <release version>]
where:

resource group - The name of the resource group that everything will be deployed in.
subscription - The subscription for the resource group.
environment - The environment in which the set up is running (dev, ci, ppe, or prod).
release version - The deployment release version.
location - Azure region where the instances will be deployed. Available Azure regions:
    centralus
    eastasia
    southeastasia
    eastus
    eastus2
    westus
    westus2
    westus3
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

onExit() {
    local exitCode=$?

    if [[ ${exitCode} != 0 ]]; then
        echo "Installation failed with exit code ${exitCode}"
        killDescendantProcesses $$
        echo "WARN: Deployments that already were triggered could still be running. To kill them, you may need to goto the Azure portal and cancel corresponding deployment."
    else
        echo "Installation completed with exit code ${exitCode}"
    fi

    exit "${exitCode}"
}

install() {
    # Login to Azure if required
    if ! az account show 1>/dev/null; then
        az login
    fi

    az account set --subscription "${subscription}"

    . "${0%/*}/create-resource-group.sh"
    . "${0%/*}/wait-for-pending-deployments.sh"
    . "${0%/*}/create-app-insights.sh"
    . "${0%/*}/get-resource-names.sh"

    # Set of scripts that can be run in parallel without external dependencies
    # shellcheck disable=SC2034
    parallelProcesses=(
        "${0%/*}/create-container-registry.sh"
        "${0%/*}/create-cosmos-db.sh"
        "${0%/*}/create-storage-account.sh"
        "${0%/*}/create-monitor-workspace.sh"
    )
    runCommandsWithoutSecretsInParallel parallelProcesses

    . "${0%/*}/create-key-vault.sh"
    . "${0%/*}/push-secrets-to-key-vault.sh"
    . "${0%/*}/push-image-to-container-registry.sh"
    . "${0%/*}/create-kubernetes-service.sh"
}

# Read script arguments
while getopts ":r:s:l:e:v:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    l) location=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${subscription} ]] || [[ -z ${location} ]] || [[ -z ${environment} ]]; then
    exitWithUsageInfo
fi

trap "onExit" EXIT

. "${0%/*}/process-utilities.sh"

install
