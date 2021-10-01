#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# Integrate Key Vault with Azure Private Link
# https://docs.microsoft.com/en-us/azure/key-vault/general/private-link-service

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

updateFirewallRules() {
    echo "Updating Key Vault firewall rules"
    ipAddress=$(az keyvault network-rule list --resource-group "${resourceGroupName}" --name "${keyVault}" --query "ipRules[?contains(value,'${kubernetesIpAddress}')]|[0].value" -o tsv)
    if [[ -z ${ipAddress} ]]; then
        az keyvault network-rule add --resource-group "${resourceGroupName}" --name "${keyVault}" --ip-address "${kubernetesIpAddress}" 1>/dev/null
    fi
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

echo "Creating private link for Key Vault ${keyVault}"
resourceName=${keyVault}
resourceId=$(az keyvault show --resource-group "${resourceGroupName}" --name "${keyVault}" --query "id" -o tsv)
resourceGroupId="vault"
privateLinkResourceId="vault"

turnOnKeyVaultFirewall
. "${0%/*}/create-private-link.sh"
updateFirewallRules

echo "Private link for Key Vault successfully created."
