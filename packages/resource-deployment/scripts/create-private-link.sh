#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -l <location> -n <resource name> -i <resource id> -g <resource group id> -p <private link resource ID>
"
    exit 1
}

disableNetworkPolicy() {
    echo "Disable virtual network policies for ${privateLinkResourceId} ${resourceName}"
    az network vnet subnet update \
        --resource-group "${vnetResourceGroup}" \
        --name "${subnet}" \
        --vnet-name "${vnet}" \
        --disable-private-endpoint-network-policies true 1>/dev/null
}

createPrivateDnsZone() {
    echo "Create private DNS zone ${privateDnsZone}"
    currentPrivateDnsZone=$(az network private-dns zone list --resource-group "${vnetResourceGroup}" --query "[?name=='${privateDnsZone}'].name" -o tsv)
    if [[ -z ${currentPrivateDnsZone} ]]; then
        az network private-dns zone create --resource-group "${vnetResourceGroup}" --name "${privateDnsZone}" 1>/dev/null
        az network private-dns zone wait --resource-group "${vnetResourceGroup}" --name "${privateDnsZone}" --created 1>/dev/null
    else
        echo "Private DNS zone ${privateDnsZone} already exists"
    fi
}

linkPrivateDnsZoneToVNet() {
    echo "Create virtual network link ${privateDnsZoneToVNetLink} between private DNS zone ${privateDnsZone} and virtual network ${vnet}"
    currentLink=$(az network private-dns link vnet list --resource-group "${vnetResourceGroup}" --zone-name "${privateDnsZone}" --query "[?name=='${privateDnsZoneToVNetLink}'].name" -o tsv)
    if [[ -z ${currentLink} ]]; then
        az network private-dns link vnet create \
            --resource-group "${vnetResourceGroup}" \
            --virtual-network "${vnet}" \
            --zone-name "${privateDnsZone}" \
            --name "${privateDnsZoneToVNetLink}" \
            --registration-enabled false 1>/dev/null

        az network private-dns link vnet wait \
            --resource-group "${vnetResourceGroup}" \
            --name "${privateDnsZoneToVNetLink}" \
            --zone-name "${privateDnsZone}" \
            --created 1>/dev/null
    else
        echo "Virtual network link ${privateDnsZoneToVNetLink} already exists"
    fi
}

createPrivateEndpoint() {
    endpoint=$(az network private-endpoint list --resource-group "${vnetResourceGroup}" --query "[?name=='${privateEndpoint}'].name" -o tsv)
    if [[ -n ${endpoint} ]]; then
        echo "Delete old private endpoint ${privateEndpoint}"
        az network private-endpoint delete --resource-group "${vnetResourceGroup}" --name "${privateEndpoint}" 1>/dev/null
    fi

    echo "Create private endpoint ${privateEndpoint}"
    az network private-endpoint create \
        --resource-group "${vnetResourceGroup}" \
        --vnet-name "${vnet}" \
        --subnet "${subnet}" \
        --name "${privateEndpoint}" \
        --private-connection-resource-id "${resourceId}" \
        --group-id "${resourceGroupId}" \
        --connection-name "${privateDnsZoneToVNetLink}" \
        --location "${location}" 1>/dev/null
}

createDnsRecord() {
    echo "Add private DNS record for ${resourceName}"
    currentRecord=$(az network private-dns record-set a list --resource-group "${vnetResourceGroup}" --zone-name "${privateDnsZone}" --query "[?name=='${resourceName}'].name" -o tsv)
    if [[ -z ${currentRecord} ]]; then
        az network private-endpoint dns-zone-group create --resource-group "${vnetResourceGroup}" \
            --endpoint-name "${privateEndpoint}" \
            --name "${privateDnsZoneGroup}" \
            --private-dns-zone "${privateDnsZone}" \
            --zone-name "${privateDnsZone}" 1>/dev/null
    else
        echo "Private DNS record for ${resourceName} already exists"
    fi
}

# Read script arguments
while getopts ":r:l:n:i:g:p:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    n) resourceName=${OPTARG} ;;
    i) resourceId=${OPTARG} ;;
    g) resourceGroupId=${OPTARG} ;;
    p) privateLinkResourceId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${location} ]] || [[ -z ${resourceName} ]] || [[ -z ${resourceId} ]] || [[ -z ${privateLinkResourceId} ]] || [[ -z ${resourceGroupId} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

vnetResourceGroup=$(az aks show --resource-group "${resourceGroupName}" --name "${kubernetesService}" -o tsv --query "nodeResourceGroup")
vnet=$(az network vnet list --resource-group "${vnetResourceGroup}" --query "[].name" -o tsv)
subnet="aks-subnet"
privateDnsZone="privatelink.${privateLinkResourceId}.azure.net"
privateDnsZoneToVNetLink="${privateLinkResourceId}-dns-private-link"
privateEndpoint="${privateLinkResourceId}-private-endpoint"
privateDnsZoneGroup="${privateLinkResourceId}-private-dns-zone-group"

echo "Private ${privateLinkResourceId} link configuration:
    privateLinkResourceId: ${privateLinkResourceId}
    resourceName: ${resourceName}
    resourceId: ${resourceId}
    resourceGroupId: ${resourceGroupId}
    vnetResourceGroup: ${vnetResourceGroup}
    vnet: ${vnet}
    subnet: ${subnet}
    privateDnsZone: ${privateDnsZone}
    privateDnsZoneToVNetLink: ${privateDnsZoneToVNetLink}
    privateEndpoint: ${privateEndpoint}"

disableNetworkPolicy
createPrivateDnsZone
linkPrivateDnsZoneToVNet
createPrivateEndpoint
createDnsRecord
