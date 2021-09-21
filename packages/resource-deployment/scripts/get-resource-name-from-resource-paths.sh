#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -p <provider path> -r <ARM line-separated resource strings>
"
    exit 1
}

# Read script arguments
previousFlag=""
for arg in "$@"; do
    # shellcheck disable=SC2249
    case ${previousFlag} in
    -p) providerPath=${arg} ;;
    -r) resourcePaths=${arg} ;;
    -?) exitWithUsageInfo ;;
    esac
    previousFlag=${arg}
done

if [[ -z ${providerPath} ]] || [[ -z ${resourcePaths} ]]; then
    exitWithUsageInfo
fi

shopt -s nocasematch
providerPathRegEx="/providers/${providerPath}/(.[^/]+)"
export resourceName=""

for resourcePath in ${resourcePaths}; do
    if [[ ${resourcePath} =~ ${providerPathRegEx} ]]; then
        resourceName="${BASH_REMATCH[1]}"
        return
    fi
done

echo "Unable to find ${providerPath} in resource paths '${resourcePaths}'"
