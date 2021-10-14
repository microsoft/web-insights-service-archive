#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

sourceKeyVault=
sourceSubscription=
sourceCertificateNames=
targetCertificateNames=
pfxPath="${0%/*}/access.pfx"

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -k <target key vault> -s <target subscription> [-p <profiles path>] [-e <environment>]
"
    exit 1
}

loginToSubscription() {
    echo "Logging in to subscription"

    if ! az account show 1>/dev/null; then
        az login
    fi
}

getLoggedInUserDetails() {
    echo "Getting logged in service principal id"

    loggedInUserType=$(az account show --query "user.type" -o tsv)
    loggedInServicePrincipalName=$(az account show --query "user.name" -o tsv)

    echo "Logged in user account type: ${loggedInUserType}"
    if [[ -z ${loggedInServicePrincipalName} ]]; then
        echo "Unable to get logged in user service principal id"
        exit 1
    fi
}

grantPermissionToKeyVault() {
    local keyVault=$1
    local permissionType=$2
    local permissionValue=$3
    local subscriptionId=$4

    echo "Granting '${permissionValue}' permission to type '${permissionType}' for key vault ${keyVault}, for the logged in user under subscription ${subscriptionId}"

    if [[ ${loggedInUserType} == "user" ]]; then
        az keyvault set-policy --name "${keyVault}" --upn "${loggedInServicePrincipalName}" "--${permissionType}" "${permissionValue}" --subscription "${subscriptionId}" 1>/dev/null
    else
        az keyvault set-policy --name "${keyVault}" --spn "${loggedInServicePrincipalName}" "--${permissionType}" "${permissionValue}" --subscription "${subscriptionId}" 1>/dev/null
    fi
}

revokePermissionsToKeyVault() {
    local keyVault=$1
    local subscriptionId=$2

    echo "Revoking permission to key vault ${keyVault} for logged in user under subscription ${subscriptionId}"

    if [[ ${loggedInUserType} == "user" ]]; then
        az keyvault delete-policy --name "${keyVault}" --upn "${loggedInServicePrincipalName}" --subscription "${subscriptionId}" 1>/dev/null
    else
        az keyvault delete-policy --name "${keyVault}" --spn "${loggedInServicePrincipalName}" --subscription "${subscriptionId}" 1>/dev/null
    fi
}

onExit-import-secrets-to-key-vault() {
    echo "Deleting downloaded pfx file"
    rm -f "${pfxPath}"

    revokePermissionsToKeyVault "${targetKeyVault}" "${targetSubscription}"
    revokePermissionsToKeyVault "${sourceKeyVault}" "${sourceSubscription}"
}

setKeyVaultPermissions() {
    loginToSubscription
    getLoggedInUserDetails

    grantPermissionToKeyVault "${sourceKeyVault}" "secret-permissions" "get" "${sourceSubscription}"
    grantPermissionToKeyVault "${targetKeyVault}" "secret-permissions" "set" "${targetSubscription}"
    grantPermissionToKeyVault "${targetKeyVault}" "certificate-permissions" "import" "${targetSubscription}"
}

uploadCertificate() {
    local sourceCertName=$1
    local targetCertName=$2

    echo "Downloading certificate from key vault ${sourceKeyVault} under name ${sourceCertName}"
    az keyvault secret download --file "${pfxPath}" --encoding base64 --name "${sourceCertName}" --vault-name "${sourceKeyVault}" --subscription "${sourceSubscription}"

    echo "Uploading certificate to key vault ${targetKeyVault} under name ${targetCertName}"
    az keyvault certificate import --file "${pfxPath}" --name "${targetCertName}" --vault-name "${targetKeyVault}" --subscription "${targetSubscription}" 1>/dev/null
}

loadProfile() {
    profileName="${profilesPath}az-sec-pack-profile.${environment}.sh"
    if [ -e "${profileName}" ]; then
        echo "Loading profile configuration file ${profileName}"

        # shellcheck disable=SC1090
        . "${profileName}"
        profileLoaded=true

        echo "Loaded profile configuration for ${environment} environment:
    sourceKeyVault: ${sourceKeyVault}
    sourceSubscription: ${sourceSubscription}"
        printf "    sourceCertificateNames: %s " "${sourceCertificateNames[@]}"
        echo ""
        printf "    targetCertificateNames: %s " "${targetCertificateNames[@]}"
        echo ""
    fi
}

# function runs in a subshell to isolate trap handler
uploadSecretsToTargetKeyVault() (
    trap 'onExit-import-secrets-to-key-vault' EXIT

    setKeyVaultPermissions
    for i in "${!sourceCertificateNames[@]}"; do
        uploadCertificate "${sourceCertificateNames[${i}]}" "${targetCertificateNames[${i}]}"
    done
)

while getopts ":e:k:s:p:" option; do
    case ${option} in
    e) environment=${OPTARG} ;;
    k) targetKeyVault=${OPTARG} ;;
    s) targetSubscription=${OPTARG} ;;
    p) profilesPath=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${targetKeyVault} ]] || [[ -z ${targetSubscription} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${environment} ]]; then
    environment="dev"
fi

if [[ -z ${profilesPath} ]]; then
    # shellcheck disable=SC2154
    profilesPath="${0%/*}/../../../../../${PRIVATEREPODROPNAME}/drop/resource-deployment/dist/profiles/"
    echo "profilesPath: ${profilesPath}"
    echo "current dscript dir: ${0%/*}"
    printenv
fi

echo "Importing secrets to key vault"

loadProfile
exit 0

if [[ "${profileLoaded}" == true ]]; then
    if [[ -z ${sourceKeyVault} ]] || [[ -z ${sourceSubscription} ]] || [[ -z ${sourceCertificateNames} ]] || [[ -z ${targetCertificateNames} ]]; then
        echo "Profile configuration file ${profileName} misconfigured."
        exit 1
    fi

    uploadSecretsToTargetKeyVault
    echo "Import secrets to key vault successfully completed."
else
    echo "Profile configuration file ${profileName} not found. Skip importing secrets to key vault."
fi
