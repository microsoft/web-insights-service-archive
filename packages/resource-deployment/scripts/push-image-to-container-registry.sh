#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-e <runtime environment>]
"
    exit 1
}

# Read script arguments
while getopts ":r:e:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

function onExit() {
    local exitCode=$?
    if [[ ${exitCode} != 0 ]]; then
        echo "Failed to push images to Azure Container Registry."
    else
        echo "Images successfully pushed to Azure Container Registry."
    fi

    exit "${exitCode}"
}

getPackagesLocation() {
    # Path for a script running from a source folder
    packagesLocation="${0%/*}/../../../packages/"
    if [ ! -d "${packagesLocation}" ]; then
        # Path for a script running from a dist folder
        packagesLocation="${0%/*}/../../../../packages/"
        if [ ! -d "${packagesLocation}" ]; then
            echo "Cannot find 'packages' folder to prepare docker images."
            exit 1
        fi
    fi
}

setImageBuildSource() {
    storageWebApiDist="${packagesLocation}storage-web-api/dist/"
}

prepareImageBuildSource() {
    echo "Copy '${environment}' runtime configuration to the docker image build source."
    cp "${0%/*}/../runtime-config/runtime-config.${environment}.json" "${storageWebApiDist}runtime-config.json"
    echo "Runtime configuration copied successfully."
}

pushImageToRegistry() {
    local name=$1
    local source=$2
    local platform=$3

    # Will print docker container build trace with target image name prefixed on each line
    az acr build --platform "${platform}" --image "${containerRegistry}".azurecr.io/"${name}":latest --registry "${containerRegistry}" "${source}" | sed -e "s/^/[${name}] /"
}

pushImagesToRegistry() {
    # shellcheck disable=SC2034
    local imageBuildProcesses=(
        "pushImageToRegistry \"storage-web-api-func\" \"${storageWebApiDist}\" \"linux\""
    )

    echo "Pushing images to Azure Container Registry."
    runCommandsWithoutSecretsInParallel imageBuildProcesses
}

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${environment} ]]; then
    environment="dev"
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

# Login to container registry
az acr login --name "${containerRegistry}"

trap "onExit" EXIT

getPackagesLocation
setImageBuildSource
prepareImageBuildSource
pushImagesToRegistry
