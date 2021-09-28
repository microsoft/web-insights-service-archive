#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -s <service name> [-c <aks cluster name>] [-e <environment>] [-v <release version>] [-f flags] [-d debug]
"
    exit 1
}

getAppInsightKey() {
    id="/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/microsoft.insights/components/${appInsights}"
    appInsightInstrumentationKey=$(az resource show --id "${id}" --query properties.InstrumentationKey --out tsv)
}

getValuesManifest() {
    file="values.yaml"
    if [[ ${environment} != "dev" ]]; then
        file="values-${environment}.yaml"
    fi

    valuesManifest="${0%/*}/../helm-charts/${serviceName}/${file}"
}

getInstallAction() {
    release=$(helm list --filter "${releaseName}" --short)
    if [[ ${release} == "${releaseName}" ]]; then
        installAction="upgrade"
    else
        installAction="install"
    fi
}

waitForAppGatewayUpdate() {
    nodeResourceGroup=$(az aks list --resource-group "${resourceGroupName}" --query "[].nodeResourceGroup" -o tsv)
    if [[ -n ${nodeResourceGroup} ]]; then
        echo "Waiting for application gateway configuration update"
        az network application-gateway wait --resource-group "${nodeResourceGroup}" --name "${appGateway}" --updated
    fi
}

getPublicDNS() {
    nodeResourceGroup=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" -o tsv --query "nodeResourceGroup")
    fqdn=$(az network public-ip show --resource-group "${nodeResourceGroup}" --name "${appGatewayPublicIP}" -o tsv --query "dnsSettings.fqdn")
}

# Read script arguments
while getopts ":r:s:c:e:v:f:d" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    s) serviceName=${OPTARG} ;;
    c) kubernetesService=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    f) flags=${OPTARG} ;;
    d) debug="debug" ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${serviceName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${environment} ]]; then
    environment="dev"
fi

if [[ -z ${releaseVersion} ]]; then
    releaseVersion=$(date -u +"%m%d%Y%H%M")
fi

if [[ -n ${debug} ]]; then
    flags="${flags} --debug --dry-run"
fi

. "${0%/*}/get-resource-names.sh"

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

# Get AKS cluster credentials
az aks get-credentials --resource-group "${resourceGroupName}" --name "${kubernetesService}" --overwrite-existing

# Switch to AKS cluster
kubectl config use-context "${kubernetesService}" 1>/dev/null

getAppInsightKey
getValuesManifest
getPublicDNS
releaseName="${serviceName}-service"
repository="${containerRegistry}.azurecr.io"
keyVaultUrl="https://${keyVault}.vault.azure.net/"
helmChart="${0%/*}/../helm-charts/${serviceName}"

# Create service managed identity
principalName="${serviceName}-sp"
. "${0%/*}/create-managed-identity.sh"
clientId=$(az identity create --resource-group "${resourceGroupName}" --name "${principalName}" --query "clientId" -o tsv)

getInstallAction

# Install service manifest
# To debug add --debug --dry-run options
# shellcheck disable=SC2086
helm "${installAction}" "${releaseName}" "${helmChart}" \
    -f "${valuesManifest}" \
    --set image.repository="${repository}" \
    --set podAnnotations.releaseId="${releaseVersion}" \
    --set env[0].name=APPINSIGHTS_INSTRUMENTATIONKEY,env[0].value="${appInsightInstrumentationKey}" \
    --set env[1].name=KEY_VAULT_URL,env[1].value="${keyVaultUrl}" \
    --set env[2].name=AZURE_CLIENT_ID,env[2].value="${clientId}" \
    --set ingress.tls[0].hosts[0]="${fqdn}" \
    ${flags}

waitForAppGatewayUpdate

echo "Kubernetes Service manifest ${serviceName} successfully installed."
