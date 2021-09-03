#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-c <aks cluster name>]
"
    exit 1
}

waitForAppGatewayUpdate() {
    nodeResourceGroup=$(az aks list --resource-group "${resourceGroupName}" --query "[].nodeResourceGroup" -o tsv)
    if [[ -n ${nodeResourceGroup} ]]; then
        echo "Waiting for application gateway configuration update"
        az network application-gateway wait --resource-group "${nodeResourceGroup}" --name "${appGateway}" --updated
    fi
}

setPublicDNSPrefix() {
    echo "Updating service public DNS name"
    nodeResourceGroup=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" -o tsv --query "nodeResourceGroup")
    fqdn=$(az network public-ip update --resource-group "${nodeResourceGroup}" --name "${appGatewayPublicIP}" \
        --dns-name "${appGatewayPublicDNSPrefix}" \
        --allocation-method Static \
        -o tsv --query "dnsSettings.fqdn")
    echo "Service public DNS name updated to ${fqdn}"
}

createCertificatePolicyFile() {
    certificatePolicyFile="${0%/*}/certificate-policy.${frontEndPublicCertificate}.generated.json"
    certificatePolicyTemplateFile="${0%/*}/../templates/certificate-policy.template.json"

    sed -e "s@<SUBJECT>@CN=${fqdn}@" -e "s@<DNSNAME>@${fqdn}@" "${certificatePolicyTemplateFile}" >"${certificatePolicyFile}"
}

createAppGatewaySslCertificate() {
    unversionedSecretId="https://${keyVault}.vault.azure.net/secrets/${frontEndPublicCertificate}"
    az network application-gateway ssl-cert create --name "${frontEndPublicCertificate}" --gateway-name "${appGateway}" --resource-group "${nodeResourceGroup}" --key-vault-secret-id "${unversionedSecretId}" 1>/dev/null
}

# Read script arguments
while getopts ":r:c:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    c) kubernetesService=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

certificateName=${frontEndPublicCertificate}

setPublicDNSPrefix
createCertificatePolicyFile
. "${0%/*}/create-certificate.sh"
createAppGatewaySslCertificate
waitForAppGatewayUpdate
