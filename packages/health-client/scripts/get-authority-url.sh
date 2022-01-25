#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC2086

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE}
"
    exit 1
}

tenantId=$(az account show --query "tenantId" -o tsv)
authorityUrl="https://login.microsoftonline.com/${tenantId}"

echo "${authorityUrl}"
