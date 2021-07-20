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

onExitPushImages() {
    local exitCode=$?
    if [[ ${exitCode} != 0 ]]; then
        echo "Failed to push images to Azure Container Registry."
    else
        echo "Images successfully pushed to Azure Container Registry."
    fi

    exit "${exitCode}"
}

getPackagesLocation() {
    # Path when script runs from a agent artifacts folder
    packagesLocation="${0%/*}/../../../../drop/"

    if [ ! -d "${packagesLocation}" ]; then
        # Path when script runs from a source folder
        packagesLocation="${0%/*}/../../../packages/"

        if [ ! -d "${packagesLocation}" ]; then
            echo "Cannot find '${packagesLocation}' folder to prepare docker images."

            exit 1
        else
            echo "Running script from a source location."
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

# function runs in a subshell to isolate trap handler
pushImagesToRegistry() (
    trap "onExitPushImages" EXIT

    # shellcheck disable=SC2034
    local imageBuildProcesses=(
        "pushImageToRegistry \"storage-web-api-func\" \"${storageWebApiDist}\" \"linux\""
    )

    echo "Pushing images to Azure Container Registry."
    runCommandsWithoutSecretsInParallel imageBuildProcesses
)

# Read script arguments
while getopts ":r:e:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

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

getPackagesLocation
setImageBuildSource
prepareImageBuildSource
pushImagesToRegistry
