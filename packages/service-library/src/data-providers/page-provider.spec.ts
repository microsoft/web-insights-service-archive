// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { ItemType, Page } from 'storage-documents';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { PageProvider } from './page-provider';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

describe(PageProvider, () => {
    const websiteId = 'website id';
    const pageId = 'page id';
    const url = 'url';
    const partitionKey = 'partition key';
    const pageDoc: Page = {
        id: pageId,
        websiteId: websiteId,
        url: url,
        itemType: ItemType.page,
        partitionKey: partitionKey,
    };
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
    let cosmosQueryResultsProviderMock: IMock<typeof getCosmosQueryResultsIterable>;

    let testSubject: PageProvider;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(ItemType.page, pageId)).returns(() => partitionKey);
        cosmosQueryResultsProviderMock = Mock.ofInstance(() => null);

        testSubject = new PageProvider(
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

    describe('createPage', () => {
        it('creates page doc', async () => {
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(websiteId)).returns(() => pageId);
            cosmosContainerClientMock.setup((c) => c.writeDocument(pageDoc)).verifiable();

            await testSubject.createPageForWebsite(url, websiteId);
        });
    });

    describe('updatePage', () => {
        it('throws if no id', () => {
            const pageData: Partial<Page> = {
                url: url,
            };

            expect(testSubject.updatePage(pageData)).rejects.toThrow();
        });

        it('updates doc with normalized properties', async () => {
            const updatedPageData: Partial<Page> = {
                lastScanDate: new Date(0, 1, 2, 3),
                id: pageId,
            };
            const updatedPageDoc = {
                itemType: 'page',
                partitionKey: partitionKey,
                ...updatedPageData,
            };

            cosmosContainerClientMock.setup((c) => c.mergeOrWriteDocument(updatedPageDoc)).verifiable();

            await testSubject.updatePage(updatedPageData);
        });
    });

    describe('readPage', () => {
        it('reads page with id', async () => {
            const response = {
                statusCode: 200,
                item: pageDoc,
            } as CosmosOperationResponse<Page>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageId, partitionKey))
                .returns(async () => response)
                .verifiable();

            const actualPage = await testSubject.readPage(pageId);

            expect(actualPage).toBe(pageDoc);
        });

        it('throws if unsuccessful status code', async () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<Page>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageId, partitionKey))
                .returns(async () => response)
                .verifiable();

            expect(testSubject.readPage(pageId)).rejects.toThrow();
        });
    });

    describe('getPagesForWebsite', () => {
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
                        value: ItemType.page,
                    },
                ],
            };
            const iterableStub = {} as CosmosQueryResultsIterable<Page>;
            partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(ItemType.page, websiteId)).returns(() => partitionKey);
            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getPagesForWebsite(websiteId);

            expect(actualIterable).toBe(iterableStub);
        });
    });
});
