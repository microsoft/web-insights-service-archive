// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { itemTypes, PageScan } from 'storage-documents';
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
    const priority = 10;
    const pageScanDoc = {
        id: pageScanId,
        pageId: pageId,
        websiteScanId: websiteScanId,
        partitionKey: partitionKey,
        itemType: itemTypes.pageScan,
        priority: priority,
        scanStatus: 'pending',
        retryCount: 0,
    } as PageScan;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
    let cosmosQueryResultsProviderMock: IMock<typeof getCosmosQueryResultsIterable>;

    let testSubject: PageScanProvider;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(itemTypes.pageScan, pageScanId)).returns(() => partitionKey);
        partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(itemTypes.pageScan, pageId)).returns(() => partitionKey);
        partitionKeyFactoryMock
            .setup((p) => p.createPartitionKeyForDocument(itemTypes.pageScan, websiteScanId))
            .returns(() => partitionKey);
        cosmosQueryResultsProviderMock = Mock.ofInstance(() => null);

        testSubject = new PageScanProvider(
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

    describe('createPageScan', () => {
        it('creates pageScan doc', async () => {
            guidGeneratorMock.setup((h) => h.createGuidFromBaseGuid(pageId)).returns(() => pageScanId);
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

        it('Errors if no partition key is provided and the fields needed to compute it are missing', () => {
            const pageScanUpdate: Partial<PageScan> = {
                id: pageScanId,
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
                itemType: itemTypes.pageScan,
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
                itemType: itemTypes.pageScan,
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

        it('uses partitionKey if one is provided', async () => {
            const updatedScanData: Partial<PageScan> = {
                scanStatus: 'pass',
                id: pageScanId,
                partitionKey: 'provided partition key',
            };
            const expectedScanDoc = {
                itemType: itemTypes.pageScan,
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

            const actualPageScan = await testSubject.readPageScan(pageScanId);

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

            expect(testSubject.readPageScan(pageScanId)).rejects.toThrow();
        });
    });

    describe('getAllPageScansForWebsiteScan', () => {
        it('calls cosmosQueryResultsProvider with expected query', () => {
            const expectedQuery = {
                query: `SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.itemType = @itemType and c.websiteScanId = @websiteScanId`,
                parameters: [
                    {
                        name: '@partitionKey',
                        value: partitionKey,
                    },
                    {
                        name: '@itemType',
                        value: itemTypes.pageScan,
                    },
                    {
                        name: '@websiteScanId',
                        value: websiteScanId,
                    },
                ],
            };
            const iterableStub = {} as CosmosQueryResultsIterable<PageScan>;

            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getAllPageScansForWebsiteScan(websiteScanId);

            expect(actualIterable).toBe(iterableStub);
        });
    });

    describe('getLatestPageScanFor', () => {
        it('Throws if unsuccessful status code', () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<PageScan[]>;

            cosmosContainerClientMock.setup((c) => c.queryDocuments(It.isAny())).returns(async () => response);

            expect(testSubject.getLatestPageScan(websiteScanId, pageId)).rejects.toThrow();
        });

        it('returns undefined if no results are found', async () => {
            const response = {
                statusCode: 200,
                item: [],
            } as CosmosOperationResponse<PageScan[]>;

            cosmosContainerClientMock.setup((c) => c.queryDocuments(It.isAny())).returns(async () => response);

            expect(await testSubject.getLatestPageScan(websiteScanId, pageId)).toBeUndefined();
        });

        it('queries db with expected query', async () => {
            const expectedFilterConditions =
                'c.partitionKey = @partitionKey and c.itemType = @itemType and c.websiteScanId = @websiteScanId and c.pageId = @pageId';
            const expectedQuery = getExpectedQueryWithConditions(expectedFilterConditions);
            const response = {
                statusCode: 200,
                item: [pageScanDoc],
            } as CosmosOperationResponse<PageScan[]>;

            cosmosContainerClientMock.setup((c) => c.queryDocuments(expectedQuery)).returns(async () => response);

            const actualResult = await testSubject.getLatestPageScan(websiteScanId, pageId);
            expect(actualResult).toEqual(pageScanDoc);
        });

        it('queries db with expected query when completed=true', async () => {
            const expectedFilterConditions =
                'c.partitionKey = @partitionKey and c.itemType = @itemType and c.websiteScanId = @websiteScanId and c.pageId = @pageId and c.scanStatus != "pending"';
            const expectedQuery = getExpectedQueryWithConditions(expectedFilterConditions);
            const response = {
                statusCode: 200,
                item: [pageScanDoc],
            } as CosmosOperationResponse<PageScan[]>;

            cosmosContainerClientMock.setup((c) => c.queryDocuments(expectedQuery)).returns(async () => response);

            const actualResult = await testSubject.getLatestPageScan(websiteScanId, pageId, true);
            expect(actualResult).toEqual(pageScanDoc);
        });

        function getExpectedQueryWithConditions(filterConditions: string): SqlQuerySpec {
            return {
                query: `SELECT TOP 1 * FROM c WHERE ${filterConditions} ORDER BY c._ts DESC`,
                parameters: [
                    {
                        name: '@partitionKey',
                        value: partitionKey,
                    },
                    {
                        name: '@itemType',
                        value: itemTypes.pageScan,
                    },
                    {
                        name: '@websiteScanId',
                        value: websiteScanId,
                    },
                    {
                        name: '@pageId',
                        value: pageId,
                    },
                ],
            };
        }
    });
});
