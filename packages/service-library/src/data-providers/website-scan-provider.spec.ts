// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { itemTypes, WebsiteScan } from 'storage-documents';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';
import { WebsiteScanProvider } from './website-scan-provider';

describe(WebsiteScanProvider, () => {
    const websiteId = 'website id';
    const websiteScanId = 'scan id';
    const partitionKey = 'partition key';
    let websiteScanDoc: WebsiteScan;
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
            .setup((p) => p.createPartitionKeyForDocument(itemTypes.websiteScan, websiteScanId))
            .returns(() => partitionKey);
        cosmosQueryResultsProviderMock = Mock.ofInstance(() => null);

        websiteScanDoc = {
            id: websiteScanId,
            websiteId: websiteId,
            scanType: 'a11y',
            scanFrequency: 'frequency',
            scanStatus: 'pending',
            itemType: itemTypes.websiteScan,
            partitionKey: partitionKey,
            priority: 0,
        };

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

            const actualWebsiteScanDoc = await testSubject.createScanDocumentForWebsite(
                websiteId,
                websiteScanDoc.scanType,
                websiteScanDoc.scanFrequency,
            );

            expect(actualWebsiteScanDoc).toEqual(websiteScanDoc);
        });

        it('creates websiteScan doc with priority', async () => {
            const priority = 10;
            websiteScanDoc.priority = priority;

            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(websiteId)).returns(() => websiteScanId);
            cosmosContainerClientMock.setup((c) => c.writeDocument(websiteScanDoc)).verifiable();

            const actualWebsiteScanDoc = await testSubject.createScanDocumentForWebsite(
                websiteId,
                websiteScanDoc.scanType,
                websiteScanDoc.scanFrequency,
                priority,
            );

            expect(actualWebsiteScanDoc).toEqual(websiteScanDoc);
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
            const expectedScanDoc = {
                itemType: itemTypes.websiteScan,
                partitionKey: partitionKey,
                ...updatedScanData,
            };
            const updatedWebsiteScan = {
                id: websiteScanId,
            } as WebsiteScan;
            const response: CosmosOperationResponse<WebsiteScan> = {
                statusCode: 200,
                item: updatedWebsiteScan,
            };

            cosmosContainerClientMock
                .setup((c) => c.mergeOrWriteDocument(expectedScanDoc))
                .returns(async () => response)
                .verifiable();

            const actualWebsiteScan = await testSubject.updateWebsiteScan(updatedScanData);

            expect(actualWebsiteScan).toEqual(updatedWebsiteScan);
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

            const actualresponse = await testSubject.readWebsiteScan(websiteScanId);

            expect(actualresponse).toBe(response);
        });
    });

    describe('getScansForWebsite', () => {
        it('calls cosmosQueryResultsProvider with expected query', () => {
            const expectedQuery = {
                query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.websiteId = @websiteId and c.itemType = @itemType',
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
                        value: itemTypes.websiteScan,
                    },
                ],
            };
            const iterableStub = {} as CosmosQueryResultsIterable<WebsiteScan>;

            partitionKeyFactoryMock
                .setup((p) => p.createPartitionKeyForDocument(itemTypes.websiteScan, websiteId))
                .returns(() => partitionKey);
            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getScansForWebsite(websiteId);

            expect(actualIterable).toBe(iterableStub);
        });
    });
});
