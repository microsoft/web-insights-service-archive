#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -p <certificate policy file> -n <certificate name> [-k <key vault>]
"
    exit 1
}

getCurrentUserDetails() {
    userType=$(az account show --query "user.type" -o tsv) || true
    principalName=$(az account show --query "user.name" -o tsv) || true

    if [[ ${userType} == "user" ]]; then
        echo "Running script using current user credentials"
    else
        echo "Running script using service principal identity"
    fi
}

grantUserAccessToKeyVault() {
    if [[ ${userType} == "user" ]]; then
        echo "Granting access to key vault for current user account"
        az keyvault set-policy --name "${keyVault}" --upn "${principalName}" --certificate-permissions get list create 1>/dev/null
    else
        echo "Granting access to key vault for service principal account"
        az keyvault set-policy --name "${keyVault}" --spn "${principalName}" --certificate-permissions get list create 1>/dev/null
    fi
}

onExit-create-certificate() {
    if [[ ${userType} == "user" ]]; then
        echo "Revoking access to key vault for current user account"
        az keyvault delete-policy --name "${keyVault}" --upn "${principalName}" 1>/dev/null || true
    else
        echo "Revoking access to key vault for service principal account"
        az keyvault delete-policy --name "${keyVault}" --spn "${principalName}" 1>/dev/null || true
    fi
}

createNewCertificateVersion() {
    local thumbprintCurrent
    local thumbprintNew

    echo "Creating new version of ${certificateName} certificate"
    if az keyvault certificate show --name "${certificateName}" --vault-name "${keyVault}" >/dev/null 2>&1; then
        thumbprintCurrent=$(az keyvault certificate show --name "${certificateName}" --vault-name "${keyVault}" --query "x509ThumbprintHex" -o tsv)
    fi

    az keyvault certificate create --vault-name "${keyVault}" --name "${certificateName}" --policy "@${certificatePolicyFile}" 1>/dev/null
    thumbprintNew=$(az keyvault certificate show --name "${certificateName}" --vault-name "${keyVault}" --query "x509ThumbprintHex" -o tsv)
    if [[ ${thumbprintCurrent} == "${thumbprintNew}" ]]; then
        echo "Error: Failure to create the ${certificateName} certificate. Validate command output for details."

        exit 1
    else
        thumbprint="${thumbprintNew}"
        echo "Created new version of ${certificateName} certificate with thumbprint ${thumbprint}"
    fi
}

# function runs in a subshell to isolate trap handler
createCertificate() (
    getCurrentUserDetails
    trap "onExit-create-certificate" EXIT
    grantUserAccessToKeyVault
    createNewCertificateVersion
)

# Read script arguments
while getopts ":r:p:n:k:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    p) certificatePolicyFile=${OPTARG} ;;
    n) certificateName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${certificatePolicyFile} ]] || [[ -z ${certificateName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${keyVault} ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

echo "Creating ${certificateName} certificate"
createCertificate
echo "Certificate ${certificateName} successfully created"
