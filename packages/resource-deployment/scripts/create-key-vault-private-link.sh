#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -l <location>
"
    exit 1
}

turnOnKeyVaultFirewall() {
    echo "Enable key vault firewall"
    az keyvault update --name "${keyVault}" --resource-group "${resourceGroupName}" --default-action deny 1>/dev/null
}

# Read script arguments
while getopts ":r:l:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

. "${0%/*}/get-resource-names.sh"

echo "Creating private link for key vault ${keyVault}"
resourceName=${keyVault}
resourceId=$(az keyvault show --resource-group "${resourceGroupName}" --name "${keyVault}" --query "id" -o tsv)
privateLinkResourceId="vault"
privateDnsZone="privatelink.vaultcore.azure.net"

turnOnKeyVaultFirewall

. "${0%/*}/create-private-link.sh"
echo "Private link successfully created."
