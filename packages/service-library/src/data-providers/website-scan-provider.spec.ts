// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { ItemType, WebsiteScan } from 'storage-documents';
import _ from 'lodash';
import { SqlQuerySpec } from '@azure/cosmos';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';
import { WebsiteScanProvider } from './website-scan-provider';

describe(WebsiteScanProvider, () => {
    const websiteId = 'website id';
    const websiteScanId = 'scan id';
    const partitionKey = 'partition key';
    const websiteScanDoc: WebsiteScan = {
        id: websiteScanId,
        websiteId: websiteId,
        scanType: 'a11y',
        scanFrequency: 5,
        scanStatus: 'pending',
        itemType: ItemType.websiteScan,
        partitionKey: partitionKey,
    };
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
    let cosmosQueryResultsProviderMock: IMock<typeof getCosmosQueryResultsIterable>;

    let testSubject: WebsiteScanProvider;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        partitionKeyFactoryMock
            .setup((p) => p.createPartitionKeyForDocument(ItemType.websiteScan, websiteScanId))
            .returns(() => partitionKey);
        cosmosQueryResultsProviderMock = Mock.ofInstance(() => null);

        testSubject = new WebsiteScanProvider(
            cosmosContainerClientMock.object,
            guidGeneratorMock.object,
            partitionKeyFactoryMock.object,
            cosmosQueryResultsProviderMock.object,
        );
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
        cosmosContainerClientMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        cosmosQueryResultsProviderMock.verifyAll();
    });

    describe('createWebsiteScan', () => {
        it('creates websiteScan doc', async () => {
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(websiteId)).returns(() => websiteScanId);
            cosmosContainerClientMock.setup((c) => c.writeDocument(websiteScanDoc)).verifiable();

            await testSubject.createScanDocumentForWebsite(websiteId, websiteScanDoc.scanType, websiteScanDoc.scanFrequency);
        });
    });

    describe('updateWebsiteScan', () => {
        it('throws if no id', () => {
            const websiteScanData: Partial<WebsiteScan> = {
                scanType: 'a11y',
            };

            expect(testSubject.updateWebsiteScan(websiteScanData)).rejects.toThrow();
        });

        it('updates doc with normalized properties', async () => {
            const updatedScanData: Partial<WebsiteScan> = {
                scanStatus: 'pass',
                id: websiteScanId,
            };
            const updatedScanDoc = {
                itemType: ItemType.websiteScan,
                partitionKey: partitionKey,
                ...updatedScanData,
            };

            cosmosContainerClientMock.setup((c) => c.mergeOrWriteDocument(updatedScanDoc)).verifiable();

            await testSubject.updateWebsiteScan(updatedScanData);
        });
    });

    describe('readWebsiteScan', () => {
        it('reads websiteScan with id', async () => {
            const response = {
                statusCode: 200,
                item: websiteScanDoc,
            } as CosmosOperationResponse<WebsiteScan>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(websiteScanId, partitionKey))
                .returns(async () => response)
                .verifiable();

            const actualWebsiteScan = await testSubject.readWebsiteScan(websiteScanId);

            expect(actualWebsiteScan).toBe(websiteScanDoc);
        });

        it('throws if unsuccessful status code', async () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<WebsiteScan>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(websiteScanId, partitionKey))
                .returns(async () => response)
                .verifiable();

            expect(testSubject.readWebsiteScan(websiteScanId)).rejects.toThrow();
        });
    });

    describe('getScansForWebsite', () => {
        const iterableStub = {} as CosmosQueryResultsIterable<WebsiteScan>;

        beforeEach(() => {
            partitionKeyFactoryMock
                .setup((p) => p.createPartitionKeyForDocument(ItemType.websiteScan, websiteId))
                .returns(() => partitionKey);
        });

        it('calls cosmosQueryResultsProvider with expected query', () => {
            const expectedQuery = getQueryWithSelectedProperties('*');

            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getScansForWebsite(websiteId);

            expect(actualIterable).toBe(iterableStub);
        });

        it('calls cosmosQueryResultsProvider with specific properties selected', () => {
            const selectedProperties: (keyof WebsiteScan)[] = ['id', 'websiteId'];
            const expectedQuery = getQueryWithSelectedProperties('id, websiteId');

            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getScansForWebsite(websiteId, selectedProperties);

            expect(actualIterable).toBe(iterableStub);
        });

        function getQueryWithSelectedProperties(selectedPropertiesString: string): SqlQuerySpec {
            return {
                query: 'SELECT @selectedProperties FROM c WHERE c.partitionKey = @partitionKey and c.websiteId = @websiteId and c.itemType = @itemType',
                parameters: [
                    {
                        name: '@websiteId',
                        value: websiteId,
                    },
                    {
                        name: '@partitionKey',
                        value: partitionKey,
                    },
                    {
                        name: '@itemType',
                        value: ItemType.websiteScan,
                    },
                    {
                        name: '@selectedProperties',
                        value: selectedPropertiesString,
                    },
                ],
            };
        }
    });
});
