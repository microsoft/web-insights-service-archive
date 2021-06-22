// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { ItemType, Page } from 'storage-documents';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { PageProvider } from './page-provider';

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

    let testSubject: PageProvider;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType(CosmosContainerClient, MockBehavior.Strict);
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(ItemType.page, pageId)).returns(() => partitionKey);

        testSubject = new PageProvider(cosmosContainerClientMock.object, guidGeneratorMock.object, partitionKeyFactoryMock.object);
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
        cosmosContainerClientMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
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

    describe('readAllPagesForWebsite', () => {
        const expectedPagesList = [{ id: 'page id 1' }, { id: 'page id 2' }, { id: 'page id 3' }] as Page[];

        it('throws if unsuccessful status code', () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<Page[]>;
            cosmosContainerClientMock.setup((c) => c.queryDocuments(It.isAny(), It.isAny())).returns(async () => response);

            expect(testSubject.readAllPagesForWebsite(websiteId)).rejects.toThrow();
        });

        it('with no continuation token', async () => {
            const response = {
                statusCode: 200,
                item: expectedPagesList,
            } as CosmosOperationResponse<Page[]>;
            cosmosContainerClientMock.setup((c) => c.queryDocuments(It.isAny(), It.isAny())).returns(async () => response);

            const actualPages = await testSubject.readAllPagesForWebsite(websiteId);

            expect(actualPages).toEqual(expectedPagesList);
        });

        it('with continuation token', async () => {
            const continuationToken = 'continuation token';
            const response1 = {
                statusCode: 200,
                item: _.slice(expectedPagesList, 0, 1),
                continuationToken: continuationToken,
            } as CosmosOperationResponse<Page[]>;
            const response2 = {
                statusCode: 200,
                item: _.slice(expectedPagesList, 1, expectedPagesList.length),
            } as CosmosOperationResponse<Page[]>;

            cosmosContainerClientMock.setup((c) => c.queryDocuments(It.isAny(), undefined)).returns(async (query, contToken) => response1);
            cosmosContainerClientMock
                .setup((c) => c.queryDocuments(It.isAny(), continuationToken))
                .returns(async (query, contToken) => response2);

            const actualPages = await testSubject.readAllPagesForWebsite(websiteId);

            expect(actualPages).toEqual(expectedPagesList);
        });
    });
});
