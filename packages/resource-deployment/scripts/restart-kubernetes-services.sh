#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -c <aks cluster name>
"
    exit 1
}

# Read script arguments
while getopts ":c:" option; do
    case ${option} in
    c) kubernetesService=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${kubernetesService} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

# Switch to AKS cluster
kubectl config use-context "${kubernetesService}" 1>/dev/null

services=$(kubectl get services -o=jsonpath='{range .items[?(@.metadata.name!="kubernetes")]}{.metadata.name}{"\n"}{end}')
for service in ${services}; do
    echo "Rolling restart of the ${service} deployment"
    kubectl rollout restart deployment/"${service}" 1>/dev/null
done

echo "Rolling restart of kubernetes deployments successfully completed."
