// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosClient } from '@azure/cosmos';
import { SecretClient } from '@azure/keyvault-secrets';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { ApplicationInsightsClient } from './app-insights-api-client/application-insights-client';

export const iocTypeNames = {
    AzureKeyVaultClientProvider: 'AzureKeyVaultClientProvider',
    BlobServiceClientProvider: 'BlobServiceClientProvider',
    CosmosClientProvider: 'CosmosClientProvider',
    QueueServiceClientProvider: 'QueueServiceClientProvider',
    ApplicationInsightsClientProvider: 'ApplicationInsightsClientProvider',
};

export type AzureKeyVaultClientProvider = () => Promise<SecretClient>;
export type BlobServiceClientProvider = () => Promise<BlobServiceClient>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
export type QueueServiceClientProvider = () => Promise<QueueServiceClient>;
export type ApplicationInsightsClientProvider = () => Promise<ApplicationInsightsClient>;

export const cosmosContainerClientTypes = {
    websiteRepoContainerClient: 'websiteRepoContainerClient',
    scanMetadataRepoContainerClient: 'scanMetadataRepoContainerClient',
};
