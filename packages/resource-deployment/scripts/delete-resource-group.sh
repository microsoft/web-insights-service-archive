#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
        Usage: ${BASH_SOURCE} -r <resource group name>
    "
    exit 1
}

tryDeleteResources() {
    for resource in "${resourcesToDelete[@]}"; do
        echo "Deleting resource ${resource}"
        az resource delete --ids "${resource}" --verbose || continue
    done
}

getResourcesToDelete() {
    ids=$(az resource list --resource-group "${resourceGroupName}" --query "[].id" -o tsv)

    resourcesToDelete=()

    echo "Resources to delete on next pass:"
    # if id contains blanks then the for loop will split the line; using while read instead
    while read -r id; do
        if [[ -n "${id}" ]]; then
            echo "  ${id}"
            resourcesToDelete+=("${id}")
        fi
    done <<<"${ids}"

    if [[ ${#resourcesToDelete[@]} -eq 0 ]]; then
        echo "  none"
    fi
}

deleteResources() {
    local deleteTimeout=1800
    local end=$((SECONDS + deleteTimeout))

    getResourcesToDelete
    while [ ${#resourcesToDelete[@]} -gt 0 ] && [ "${SECONDS}" -le "${end}" ]; do
        tryDeleteResources
        getResourcesToDelete
    done

    if [[ ${#resourcesToDelete[@]} -eq 0 ]]; then
        echo "Resource group ${resourceGroupName} contains no resources to delete"
    elif [[ ${SECONDS} -ge ${end} ]]; then
        echo "Timeout while deleting resources from resource group ${resourceGroupName}"
        exit 1
    else
        echo "Error deleting resources from resource group ${resourceGroupName}"
        exit 1
    fi
}

deleteResourceGroup() {
    local resourceGroupName=$1
    local response

    response=$(az group exists --name "${resourceGroupName}")
    if [[ "${response}" == true ]]; then
        echo "Resource group ${resourceGroupName} exists."

        echo "Deleting resources from resource group ${resourceGroupName}"
    else
        echo "Resource group ${resourceGroupName} does not exist."
    fi
}

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

deleteResourceGroup "${resourceGroupName}"
