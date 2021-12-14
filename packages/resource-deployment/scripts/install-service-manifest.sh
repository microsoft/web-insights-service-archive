#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -s <service name> [-c <aks cluster name>] [-e <environment>] [-v <release version>] [-f flags] [-n <environment variables(comma-separated name=value pairs)>] [-d debug]
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

formatEnvVariables() {
    local index=0
    local varName
    local varValue
    local allEnvVariables="${commonEnvVariables},${customEnvVariables}"

    oldIFS=${IFS}
    IFS=","
    for envPair in ${allEnvVariables}; do
        if [[ -z ${envPair} ]]; then
            continue
        fi

        if [[ "${envPair}" != *"="* ]]; then
            echo "Env variables parameter is incorrectly formated. Must be a comma separated list of name=value pairs."
            echo "${customEnvVariables}"
            echo "${envPair}"
            exitWithUsageInfo
        fi
        varName="$(cut -d "=" -f 1 <<<"${envPair}")"
        varValue="$(cut -d "=" -f 2- <<<"${envPair}")"

        # shellcheck disable=SC2089
        formattedEnvPair="env[${index}].name=${varName},env[${index}].value=\"${varValue}\""
        if [[ -z ${formattedEnvVariables} ]]; then
            formattedEnvVariables="${formattedEnvPair}"
        else
            formattedEnvVariables="${formattedEnvVariables},${formattedEnvPair}"
        fi

        ((index = index + 1))
    done
    IFS=${oldIFS}
}

waitForAppGatewayUpdate() {
    nodeResourceGroup=$(az aks list --resource-group "${resourceGroupName}" --query "[].nodeResourceGroup" -o tsv)
    if [[ -n ${nodeResourceGroup} ]]; then
        echo "Waiting for application gateway configuration update"
        az network application-gateway wait --resource-group "${nodeResourceGroup}" --name "${appGateway}" --updated
    fi
}

# Read script arguments
while getopts ":r:s:c:e:v:f:n:d" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    s) serviceName=${OPTARG} ;;
    c) kubernetesService=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    f) flags=${OPTARG} ;;
    n) customEnvVariables=${OPTARG} ;;
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
releaseName="${serviceName}-service"
repository="${containerRegistry}.azurecr.io"
keyVaultUrl="https://${keyVault}.vault.azure.net/"
helmChart="${0%/*}/../helm-charts/${serviceName}"

# Create service managed identity
principalName="${serviceName}-sp-${resourceNameSuffix}"
. "${0%/*}/create-managed-identity.sh"

getInstallAction

# Set common env variables before formatting
commonEnvVariables="APPINSIGHTS_INSTRUMENTATIONKEY=${appInsightInstrumentationKey}"
commonEnvVariables+=",KEY_VAULT_URL=${keyVaultUrl}"
commonEnvVariables+=",AZURE_PRINCIPAL_ID=${principalId}"
formatEnvVariables

# Install service manifest
# To debug add --debug --dry-run options
# shellcheck disable=SC2086
helm "${installAction}" "${releaseName}" "${helmChart}" \
    -f "${valuesManifest}" \
    --set image.repository="${repository}" \
    --set podAnnotations.releaseId="${releaseVersion}" \
    --set podPrincipalName="${principalName}" \
    --set "${formattedEnvVariables}" \
    ${flags}

waitForAppGatewayUpdate

echo "Kubernetes Service manifest ${serviceName} successfully installed."
