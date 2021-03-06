// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { IoC } from 'common';
import { Container, interfaces } from 'inversify';
import { SecretClient } from '@azure/keyvault-secrets';
import { TokenCredential } from '@azure/identity';
import { ContextAwareLogger } from 'logger';
import { StorageContainerSASUrlProvider } from './azure-blob/storage-container-sas-url-provider';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { cosmosContainerClientTypes, iocTypeNames } from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { CosmosContainerClient } from './storage/cosmos-container-client';
import { AzureManagedCredential } from './credentials/azure-managed-credential';
import { AclProvider } from './azure-auth/acl-provider';
import { ApplicationInsightsClient } from '.';

export function registerAzureServicesToContainer(
    container: Container,
    cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient = defaultCosmosClientFactory,
): void {
    container.bind(AzureManagedCredential).toSelf().inSingletonScope();
    setupSingletonAzureKeyVaultClientProvider(container);
    container.bind(SecretProvider).toSelf().inSingletonScope();
    container.bind(AclProvider).toSelf().inSingletonScope();
    container.bind(StorageConfig).toSelf().inSingletonScope();

    setupSingletonQueueServiceClientProvider(container);

    setupSingletonCosmosClientProvider(container, cosmosClientFactory);
    container.bind(CosmosClientWrapper).toSelf();
    container.bind(cosmosContainerClientTypes.websiteRepoContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'WebInsights', 'websiteData');
    });
    container.bind(cosmosContainerClientTypes.scanMetadataRepoContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'WebInsights', 'scanMetadata');
    });

    setupBlobServiceClientProvider(container);
    container.bind(StorageContainerSASUrlProvider).toSelf().inSingletonScope();
    container.bind(Queue).toSelf();

    setupApplicationInsightsClientProvider(container);
}

async function getStorageAccountName(context: interfaces.Context): Promise<string> {
    if (process.env.AZURE_STORAGE_NAME !== undefined) {
        return process.env.AZURE_STORAGE_NAME;
    } else {
        const secretProvider = context.container.get(SecretProvider);

        return secretProvider.getSecret(secretNames.storageAccountName);
    }
}

function setupBlobServiceClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<BlobServiceClient>(iocTypeNames.BlobServiceClientProvider, container, async (context) => {
        const accountName = await getStorageAccountName(context);
        const azureCredential = container.get<TokenCredential>(AzureManagedCredential);

        return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, azureCredential);
    });
}

function createCosmosContainerClient(container: interfaces.Container, dbName: string, collectionName: string): CosmosContainerClient {
    return new CosmosContainerClient(container.get(CosmosClientWrapper), dbName, collectionName, container.get(ContextAwareLogger));
}

function setupSingletonAzureKeyVaultClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<SecretClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async (context) => {
        const credentials = container.get<TokenCredential>(AzureManagedCredential);

        return new SecretClient(process.env.KEY_VAULT_URL, credentials);
    });
}

function setupSingletonQueueServiceClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<QueueServiceClient>(iocTypeNames.QueueServiceClientProvider, container, async (context) => {
        const accountName = await getStorageAccountName(context);
        const credential = container.get<TokenCredential>(AzureManagedCredential);

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
            const credentials = container.get<TokenCredential>(AzureManagedCredential);

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

function setupApplicationInsightsClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<ApplicationInsightsClient>(iocTypeNames.ApplicationInsightsClientProvider, container, async (context) => {
        const secretProvider = context.container.get(SecretProvider);
        const appInsightsApiKey = await secretProvider.getSecret(secretNames.appInsightsApiKey);

        return new ApplicationInsightsClient(process.env.APPINSIGHTS_APPID, appInsightsApiKey);
    });
}
