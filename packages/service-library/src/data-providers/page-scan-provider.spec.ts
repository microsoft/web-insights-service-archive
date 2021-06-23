// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { HashGenerator } from 'common';
import { ItemType, PageScan } from 'storage-documents';
import _ from 'lodash';
import { SqlQuerySpec } from '@azure/cosmos';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';
import { PageScanProvider } from './page-scan-provider';

describe(PageScanProvider, () => {
    const websiteScanId = 'website scan id';
    const pageId = 'page id';
    const pageScanId = 'page scan id';
    const partitionKey = 'partition key';
    const currentDate = new Date(0, 1, 2, 3);
    const getCurrentDateStub = () => currentDate;
    const priority = 10;
    const pageScanDoc = {
        id: pageScanId,
        pageId: pageId,
        websiteScanId: websiteScanId,
        partitionKey: partitionKey,
        itemType: ItemType.pageScan,
        priority: priority,
        startDate: currentDate,
        scanStatus: 'pending',
        retryCount: 0,
    } as PageScan;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let hashGeneratorMock: IMock<HashGenerator>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
    let cosmosQueryResultsProviderMock: IMock<typeof getCosmosQueryResultsIterable>;

    let testSubject: PageScanProvider;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(ItemType.pageScan, pageId)).returns(() => partitionKey);
        partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(ItemType.pageScan, websiteScanId)).returns(() => partitionKey);
        hashGeneratorMock.setup((h) => h.getPageScanDocumentId(pageId, websiteScanId)).returns(() => pageScanId);
        cosmosQueryResultsProviderMock = Mock.ofInstance(() => null);

        testSubject = new PageScanProvider(
            cosmosContainerClientMock.object,
            hashGeneratorMock.object,
            partitionKeyFactoryMock.object,
            cosmosQueryResultsProviderMock.object,
            getCurrentDateStub,
        );
    });

    afterEach(() => {
        hashGeneratorMock.verifyAll();
        cosmosContainerClientMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        cosmosQueryResultsProviderMock.verifyAll();
    });

    describe('createPageScan', () => {
        it('creates pageScan doc', async () => {
            cosmosContainerClientMock.setup((c) => c.writeDocument(pageScanDoc)).verifiable();

            const actualPageScan = await testSubject.createPageScan(pageId, websiteScanId, priority);

            expect(actualPageScan).toEqual(pageScanDoc);
        });
    });

    describe('updatePageScan', () => {
        const updatedScanDoc = {
            id: pageScanId,
        } as PageScan;
        const successfulUpdateResponse: CosmosOperationResponse<PageScan> = {
            statusCode: 200,
            item: updatedScanDoc,
        };

        it('throws if no id', () => {
            const pageScanUpdate: Partial<PageScan> = {
                scanStatus: 'pass',
            };

            expect(testSubject.updatePageScan(pageScanUpdate)).rejects.toThrow();
        });

        it('updates doc with normalized properties when pageId is present', async () => {
            const updatedScanData: Partial<PageScan> = {
                scanStatus: 'pass',
                id: pageScanId,
                pageId: pageId,
            };
            const expectedScanDoc = {
                itemType: ItemType.pageScan,
                partitionKey: partitionKey,
                ...updatedScanData,
            };

            cosmosContainerClientMock
                .setup((c) => c.mergeOrWriteDocument(expectedScanDoc))
                .returns(async () => successfulUpdateResponse)
                .verifiable();

            const actualPageScan = await testSubject.updatePageScan(updatedScanData);

            expect(actualPageScan).toEqual(updatedScanDoc);
        });

        it('updates doc with normalized properties when websiteScanId is present', async () => {
            const updatedScanData: Partial<PageScan> = {
                scanStatus: 'pass',
                id: pageScanId,
                websiteScanId: websiteScanId,
            };
            const expectedScanDoc = {
                itemType: ItemType.pageScan,
                partitionKey: partitionKey,
                ...updatedScanData,
            };

            cosmosContainerClientMock
                .setup((c) => c.mergeOrWriteDocument(expectedScanDoc))
                .returns(async () => successfulUpdateResponse)
                .verifiable();

            const actualPageScan = await testSubject.updatePageScan(updatedScanData);

            expect(actualPageScan).toEqual(updatedScanDoc);
        });

        it('does not overwrite partitionKey if websiteScanId and pageId are both missing', async () => {
            const updatedScanData: Partial<PageScan> = {
                scanStatus: 'pass',
                id: pageScanId,
            };
            const expectedScanDoc = {
                itemType: ItemType.pageScan,
                ...updatedScanData,
            };

            cosmosContainerClientMock
                .setup((c) => c.mergeOrWriteDocument(expectedScanDoc))
                .returns(async () => successfulUpdateResponse)
                .verifiable();

            const actualPageScan = await testSubject.updatePageScan(updatedScanData);

            expect(actualPageScan).toEqual(updatedScanDoc);
        });
    });

    describe('readPageScan', () => {
        it('reads pageScan with the specified pageId and websiteScanId', async () => {
            const response = {
                statusCode: 200,
                item: pageScanDoc,
            } as CosmosOperationResponse<PageScan>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageScanId, partitionKey))
                .returns(async () => response)
                .verifiable();

            const actualPageScan = await testSubject.readPageScan(pageId, websiteScanId);

            expect(actualPageScan).toBe(pageScanDoc);
        });

        it('throws if unsuccessful status code', async () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<PageScan>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageScanId, partitionKey))
                .returns(async () => response)
                .verifiable();

            expect(testSubject.readPageScan(pageId, websiteScanId)).rejects.toThrow();
        });
    });

    describe('readPageScanWithId', () => {
        it('reads pageScan with id', async () => {
            const response = {
                statusCode: 200,
                item: pageScanDoc,
            } as CosmosOperationResponse<PageScan>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageScanId))
                .returns(async () => response)
                .verifiable();

            const actualPageScan = await testSubject.readPageScanWithId(pageScanId);

            expect(actualPageScan).toBe(pageScanDoc);
        });

        it('throws if unsuccessful status code', async () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<PageScan>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageScanId))
                .returns(async () => response)
                .verifiable();

            expect(testSubject.readPageScanWithId(pageScanId)).rejects.toThrow();
        });
    });

    describe('getPageScansForWebsiteScan', () => {
        const iterableStub = {} as CosmosQueryResultsIterable<PageScan>;

        it('calls cosmosQueryResultsProvider with expected query', () => {
            const expectedQuery = getQueryWithSelectedProperties('*');

            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getPageScansForWebsiteScan(websiteScanId);

            expect(actualIterable).toBe(iterableStub);
        });

        it('calls cosmosQueryResultsProvider with specific properties selected', () => {
            const selectedProperties: (keyof PageScan)[] = ['id', 'websiteScanId'];
            const expectedQuery = getQueryWithSelectedProperties('id, websiteScanId');

            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getPageScansForWebsiteScan(websiteScanId, selectedProperties);

            expect(actualIterable).toBe(iterableStub);
        });

        function getQueryWithSelectedProperties(selectedPropertiesString: string): SqlQuerySpec {
            return {
                query: `SELECT @selectedProperties FROM c WHERE c.partitionKey = @partitionKey and c.itemType = @itemType and c.websiteScanId = @websiteScanId`,
                parameters: [
                    {
                        name: '@partitionKey',
                        value: partitionKey,
                    },
                    {
                        name: '@itemType',
                        value: ItemType.pageScan,
                    },
                    {
                        name: '@selectedProperties',
                        value: selectedPropertiesString,
                    },
                    {
                        name: '@websiteScanId',
                        value: websiteScanId,
                    },
                ],
            };
        }
    });
});
