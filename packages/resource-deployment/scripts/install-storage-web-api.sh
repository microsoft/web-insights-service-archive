#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-c <aks cluster name>] [-e <environment>] [-v <release version>] [-d debug]
"
    exit 1
}

# Read script arguments
while getopts ":r:s:c:e:v:d" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    c) kubernetesService=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    d) debug="debug" ;;
    *) exitWithUsageInfo ;;
    esac
done

. "${0%/*}/get-resource-names.sh"

serviceName="storage-web-api"
clientId=$(az aks show -n "${kubernetesService}" -g "${resourceGroupName}" --query "identityProfile.kubeletidentity.clientId" -o tsv)

. "${0%/*}/install-service-manifest.sh"
