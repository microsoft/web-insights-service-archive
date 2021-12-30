#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export dropFolder
export environment

getPackagesLocation() {
    # Path when script runs from a agent artifacts folder
    dropFolder="${0%/*}/../../../../drop/"

    if [ ! -d "${dropFolder}" ]; then
        # Path when script runs from a source folder
        dropFolder="${0%/*}/../../../packages/"

        if [ ! -d "${dropFolder}" ]; then
            echo "Cannot find '${dropFolder}' folder."

            exit 1
        else
            echo "Running script from a source location."
        fi
    fi
}

uploadFileIfExists() {
    destinationContainer=$1
    pathToSource=$2
    storageAccountName=$3
    blobName=$4

    if [ -f "${pathToSource}" ]; then
        az storage blob upload --account-name "${storageAccountName}" --container-name "${destinationContainer}" --file "${pathToSource}" --name "${blobName}" 1>/dev/null
    else
        echo "WARNING: Could not find file ${pathToSource}. Skipping upload."
    fi
}

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -r <resource group name> -d <path to drop folder. Will use '${dropFolder}' folder relative to current working directory> -e <deploy environment>
"
    exit 1
}

# Read script arguments
while getopts ":r:d:e:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${dropFolder} ]]; then
    getPackagesLocation
fi

if [[ -z ${environment} ]]; then
    environment="dev"
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

function uploadFiles() {
    echo "Uploading files to Blob storage"

    uploadProcesses=(
        "uploadFileIfExists \"e2e-test-data\" \"${dropFolder}/resource-deployment/dist/e2e-test-data/test-website.${environment}.json\" \"${storageAccount}\" \"test-website.json\""
    )

    waitForCommandsInParallel uploadProcesses

    echo "Upload files completed successfully."
}

uploadFiles
