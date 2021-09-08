// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { IoC } from 'common';
import { Container, interfaces } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { SecretClient } from '@azure/keyvault-secrets';
import { StorageContainerSASUrlProvider } from './azure-blob/storage-container-sas-url-provider';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { CredentialsProvider } from './credentials/credentials-provider';
import { cosmosContainerClientTypes, iocTypeNames } from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { CosmosContainerClient } from './storage/cosmos-container-client';

export function registerAzureServicesToContainer(
    container: Container,
    cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient = defaultCosmosClientFactory,
): void {
    container.bind(CredentialsProvider).toSelf().inSingletonScope();

    setupSingletonAzureKeyVaultClientProvider(container);

    container.bind(SecretProvider).toSelf().inSingletonScope();

    container.bind(StorageConfig).toSelf().inSingletonScope();

    setupSingletonCosmosClientProvider(container, cosmosClientFactory);

    container.bind(CosmosClientWrapper).toSelf();

    setupSingletonQueueServiceClientProvider(container);

    container.bind(cosmosContainerClientTypes.websiteRepoContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'WebInsights', 'websiteData');
    });

    container.bind(cosmosContainerClientTypes.scanMetadataRepoContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'WebInsights', 'scanMetadata');
    });

    setupBlobServiceClientProvider(container);
    container.bind(StorageContainerSASUrlProvider).toSelf().inSingletonScope();
    container.bind(Queue).toSelf();
}

async function getStorageAccountName(context: interfaces.Context): Promise<string> {
    if (process.env.AZURE_STORAGE_NAME !== undefined) {
        return process.env.AZURE_STORAGE_NAME;
    } else {
        const secretProvider = context.container.get(SecretProvider);

        return secretProvider.getSecret(secretNames.storageAccountName);
    }
}

// DefaultAzureCredential will first look for Azure Active Directory (AAD)
// client secret credentials in the following environment variables:
//
// - AZURE_TENANT_ID: The ID of your AAD tenant
// - AZURE_CLIENT_ID: The ID of your AAD app registration (client)
// - AZURE_CLIENT_SECRET: The client secret for your AAD app registration
//
// If those environment variables aren't found and your application is deployed
// to an Azure VM or App Service instance, the managed service identity endpoint
// will be used as a fallback authentication source.
function setupBlobServiceClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<BlobServiceClient>(iocTypeNames.BlobServiceClientProvider, container, async (context) => {
        const accountName = await getStorageAccountName(context);
        const credentialsProvider = container.get(CredentialsProvider);
        const azureCredential = credentialsProvider.getDefaultTokenCredential();

        return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, azureCredential);
    });
}

function createCosmosContainerClient(container: interfaces.Container, dbName: string, collectionName: string): CosmosContainerClient {
    return new CosmosContainerClient(container.get(CosmosClientWrapper), dbName, collectionName, container.get(ContextAwareLogger));
}

function setupSingletonAzureKeyVaultClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<SecretClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async (context) => {
        const credentialsProvider = container.get(CredentialsProvider);
        const credentials = credentialsProvider.getDefaultTokenCredential();

        return new SecretClient(process.env.KEY_VAULT_URL, credentials);
    });
}

function setupSingletonQueueServiceClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<QueueServiceClient>(iocTypeNames.QueueServiceClientProvider, container, async (context) => {
        const accountName = await getStorageAccountName(context);
        const credentialsProvider = container.get(CredentialsProvider);
        const credential = credentialsProvider.getDefaultTokenCredential();

        return new QueueServiceClient(`https://${accountName}.queue.core.windows.net`, credential);
    });
}

function setupSingletonCosmosClientProvider(
    container: interfaces.Container,
    cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient,
): void {
    IoC.setupSingletonProvider<CosmosClient>(iocTypeNames.CosmosClientProvider, container, async (context) => {
        let cosmosDbUrl: string;
        if (process.env.COSMOS_DB_URL !== undefined && process.env.COSMOS_DB_KEY !== undefined) {
            return cosmosClientFactory({ endpoint: process.env.COSMOS_DB_URL, key: process.env.COSMOS_DB_KEY });
        } else {
            const secretProvider = context.container.get(SecretProvider);
            cosmosDbUrl = await secretProvider.getSecret(secretNames.cosmosDbUrl);
            const credentialsProvider = container.get(CredentialsProvider);
            const credentials = credentialsProvider.getDefaultTokenCredential();

            return cosmosClientFactory({ endpoint: cosmosDbUrl, aadCredentials: credentials });
        }
    });
}

function defaultCosmosClientFactory(cosmosClientOptions: CosmosClientOptions): CosmosClient {
    const options = {
        connectionPolicy: {
            requestTimeout: 10000,
        },
        ...cosmosClientOptions,
    };

    return new CosmosClient(options);
}
