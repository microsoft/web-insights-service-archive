// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosClient } from '@azure/cosmos';
import { SecretClient } from '@azure/keyvault-secrets';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';

export const iocTypeNames = {
    AzureCredential: 'AzureCredential',
    AzureKeyVaultClientProvider: 'AzureKeyVaultClientProvider',
    BlobServiceClientProvider: 'BlobServiceClientProvider',
    CosmosClientProvider: 'CosmosClientProvider',
    QueueServiceClientProvider: 'QueueServiceClientProvider',
};

export type AzureKeyVaultClientProvider = () => Promise<SecretClient>;
export type BlobServiceClientProvider = () => Promise<BlobServiceClient>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
export type QueueServiceClientProvider = () => Promise<QueueServiceClient>;

export const cosmosContainerClientTypes = {
    websiteRepoContainerClient: 'websiteRepoContainerClient',
    scanMetadataRepoContainerClient: 'scanMetadataRepoContainerClient',
};
