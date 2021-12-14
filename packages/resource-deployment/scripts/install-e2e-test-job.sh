#!/usr/bin/env bash

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

getPublicDNS() {
    nodeResourceGroup=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" -o tsv --query "nodeResourceGroup")
    fqdn=$(az network public-ip show --resource-group "${nodeResourceGroup}" --name "${appGatewayPublicIP}" -o tsv --query "dnsSettings.fqdn")
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

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

getPublicDNS

serviceName="e2e-test-runner"
storageApiBaseUrl="https://${fqdn}/storage/api"
customEnvVariables="WEB_API_BASE_URL=${storageApiBaseUrl}"

. "${0%/*}/install-service-manifest.sh"
. "${0%/*}/grant-service-principal-access.sh"

echo "The E2E Test Runner job successfully installed."
