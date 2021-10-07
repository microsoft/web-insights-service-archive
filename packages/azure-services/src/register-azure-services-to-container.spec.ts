// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import { Container, interfaces } from 'inversify';
import * as _ from 'lodash';
import { ContextAwareLogger, registerLoggerToContainer } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { SecretClient } from '@azure/keyvault-secrets';
import { QueueServiceClient } from '@azure/storage-queue';
import { DefaultAzureCredential } from '@azure/identity';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import {
    AzureKeyVaultClientProvider,
    BlobServiceClientProvider,
    CosmosClientProvider,
    cosmosContainerClientTypes,
    iocTypeNames,
    QueueServiceClientProvider,
} from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { registerAzureServicesToContainer } from './register-azure-services-to-container';
import { CosmosContainerClient } from './storage/cosmos-container-client';

/* eslint-disable @typescript-eslint/no-explicit-any */

const cosmosClientFactoryStub = (options: CosmosClientOptions) => {
    return { test: 'cosmosClient', options: options } as unknown as CosmosClient;
};

describe(registerAzureServicesToContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        registerLoggerToContainer(container);
    });

    it('verify singleton resolution', async () => {
        registerAzureServicesToContainer(container);

        verifySingletonDependencyResolution(container, StorageConfig);
        verifySingletonDependencyResolution(container, SecretProvider);
        verifySingletonDependencyResolution(container, iocTypeNames.AzureCredential);
    });

    it('verify non-singleton resolution', () => {
        registerAzureServicesToContainer(container);

        verifyNonSingletonDependencyResolution(container, Queue);
        verifyNonSingletonDependencyResolution(container, CosmosClientWrapper);
    });

    it('resolves CosmosContainerClient', () => {
        registerAzureServicesToContainer(container);

        verifyCosmosContainerClient(container, cosmosContainerClientTypes.websiteRepoContainerClient, 'WebInsights', 'websiteData');
        verifyCosmosContainerClient(container, cosmosContainerClientTypes.scanMetadataRepoContainerClient, 'WebInsights', 'scanMetadata');
    });

    describe('BlobServiceClientProvider', () => {
        const storageAccountName = 'test-storage-account-name';

        it('creates singleton blob service client', async () => {
            const secretProviderMock: IMock<SecretProvider> = Mock.ofType(SecretProvider);

            secretProviderMock
                .setup(async (s) => s.getSecret(secretNames.storageAccountName))
                .returns(async () => storageAccountName)
                .verifiable(Times.once());
            registerAzureServicesToContainer(container);
            stubBinding(container, SecretProvider, secretProviderMock.object);

            const blobServiceClientProvider = container.get<BlobServiceClientProvider>(iocTypeNames.BlobServiceClientProvider);

            const blobServiceClient1 = await blobServiceClientProvider();
            const blobServiceClient2 = await blobServiceClientProvider();
            const blobServiceClient3 = await container.get<BlobServiceClientProvider>(iocTypeNames.BlobServiceClientProvider)();

            expect(blobServiceClient1).toBeInstanceOf(BlobServiceClient);
            expect(blobServiceClient2).toBe(blobServiceClient1);
            expect(blobServiceClient3).toBe(blobServiceClient1);
        });
    });

    describe('QueueServiceURLProvider', () => {
        const storageAccountName = 'test-storage-account-name';
        let secretProviderMock: IMock<SecretProvider>;

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);
            secretProviderMock
                .setup(async (s) => s.getSecret(secretNames.storageAccountName))
                .returns(async () => storageAccountName)
                .verifiable(Times.once());
            registerAzureServicesToContainer(container);
            stubBinding(container, SecretProvider, secretProviderMock.object);
        });

        afterEach(() => {
            secretProviderMock.verifyAll();
        });

        it('verify Azure QueueService resolution', async () => {
            const queueServiceClientProvider = container.get<QueueServiceClientProvider>(iocTypeNames.QueueServiceClientProvider);
            const queueServiceClient = await queueServiceClientProvider();

            expect(queueServiceClient).toBeInstanceOf(QueueServiceClient);
        });

        it('creates singleton queueService instance', async () => {
            const queueServiceClientProvider1 = container.get<QueueServiceClientProvider>(iocTypeNames.QueueServiceClientProvider);
            const queueServiceClientProvider2 = container.get<QueueServiceClientProvider>(iocTypeNames.QueueServiceClientProvider);
            const queueServiceClient1Promise = queueServiceClientProvider1();
            const queueServiceClient2Promise = queueServiceClientProvider2();

            expect(await queueServiceClient1Promise).toBe(await queueServiceClient2Promise);
        });
    });

    describe('AzureKeyVaultClientProvider', () => {
        beforeEach(() => {
            registerAzureServicesToContainer(container);
        });

        it('gets KeyVaultClient', async () => {
            const keyVaultClientProvider = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            const keyVaultClient = await keyVaultClientProvider();

            expect(keyVaultClient).toBeInstanceOf(SecretClient);
        });

        it('gets singleton KeyVaultClient', async () => {
            const keyVaultClientProvider1 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            const keyVaultClientProvider2 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);

            const keyVaultClient1Promise = keyVaultClientProvider1();
            const keyVaultClient2Promise = keyVaultClientProvider2();

            expect(await keyVaultClient1Promise).toBe(await keyVaultClient2Promise);
        });
    });

    describe('CosmosClientProvider', () => {
        let secretProviderMock: IMock<SecretProvider>;
        const cosmosDbUrl = 'db url';
        const cosmosDbKey = 'db key';
        const credentialStub = {} as DefaultAzureCredential;

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);

            secretProviderMock
                .setup(async (s) => s.getSecret(secretNames.cosmosDbUrl))
                .returns(async () => Promise.resolve(cosmosDbUrl))
                .verifiable();
        });

        afterEach(() => {
            secretProviderMock.verifyAll();
        });

        it('verify CosmosClientProvider resolution', async () => {
            const expectedOptions = { endpoint: cosmosDbUrl, aadCredentials: credentialStub };

            runCosmosClientTest(container, secretProviderMock);
            stubBinding(container, iocTypeNames.AzureCredential, credentialStub);

            const expectedCosmosClient = cosmosClientFactoryStub(expectedOptions);
            const cosmosClientProvider = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClient = await cosmosClientProvider();

            expect(cosmosClient).toMatchObject(expectedCosmosClient);
        });

        it('creates singleton queueService instance', async () => {
            runCosmosClientTest(container, secretProviderMock);

            const cosmosClientProvider1 = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClientProvider2 = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);

            const cosmosClient1Promise = cosmosClientProvider1();
            const cosmosClient2Promise = cosmosClientProvider2();

            expect(await cosmosClient1Promise).toBe(await cosmosClient2Promise);
        });

        it('use env variables if available', async () => {
            const expectedOptions = { endpoint: cosmosDbUrl, key: cosmosDbKey };
            secretProviderMock.reset();
            secretProviderMock.setup(async (s) => s.getSecret(secretNames.cosmosDbUrl)).verifiable(Times.never());
            process.env.COSMOS_DB_URL = cosmosDbUrl;
            process.env.COSMOS_DB_KEY = cosmosDbKey;

            runCosmosClientTest(container, secretProviderMock);

            const expectedCosmosClient = cosmosClientFactoryStub(expectedOptions);
            const cosmosClientProvider = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClient = await cosmosClientProvider();

            expect(cosmosClient).toEqual(expectedCosmosClient);
        });
    });
});

function stubBinding(container: Container, bindingName: interfaces.ServiceIdentifier<any>, value: any): void {
    container.unbind(bindingName);
    container.bind(bindingName).toDynamicValue(() => value);
}

function verifySingletonDependencyResolution(container: Container, key: any): void {
    expect(container.get(key)).toBeDefined();
    expect(container.get(key)).toBe(container.get(key));
}

function verifyNonSingletonDependencyResolution(container: Container, key: any): void {
    expect(container.get(key)).toBeDefined();
    expect(container.get(key)).not.toBe(container.get(key));
}

function verifyCosmosContainerClient(container: Container, cosmosContainerType: string, dbName: string, collectionName: string): void {
    const cosmosContainerClient = container.get<CosmosContainerClient>(cosmosContainerType);
    expect((cosmosContainerClient as any).dbName).toBe(dbName);
    expect((cosmosContainerClient as any).collectionName).toBe(collectionName);
    expect((cosmosContainerClient as any).logger).toBe(container.get(ContextAwareLogger));
}

function runCosmosClientTest(container: Container, secretProviderMock: IMock<SecretProvider>): void {
    registerAzureServicesToContainer(container, cosmosClientFactoryStub);
    stubBinding(container, SecretProvider, secretProviderMock.object);
}
