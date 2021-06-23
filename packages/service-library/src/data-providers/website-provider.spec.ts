// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, MockBehavior } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { DocumentDataOnly, ItemType, PartitionKey, Website } from 'storage-documents';
import { WebsiteProvider } from './website-provider';

describe(WebsiteProvider, () => {
    const websiteId = 'website id';
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    let testSubject: WebsiteProvider;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType(CosmosContainerClient, MockBehavior.Strict);
        guidGeneratorMock = Mock.ofType<GuidGenerator>();

        testSubject = new WebsiteProvider(cosmosContainerClientMock.object, guidGeneratorMock.object);
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
        cosmosContainerClientMock.verifyAll();
    });

    describe('createWebsite', () => {
        it('generates id and adds additional document properties', async () => {
            const websiteData = {
                name: 'test website',
            } as DocumentDataOnly<Website>;

            const expectedDocument = getNormalizedDocument(websiteData);

            guidGeneratorMock
                .setup((g) => g.createGuid())
                .returns(() => websiteId)
                .verifiable();
            cosmosContainerClientMock.setup((c) => c.writeDocument(expectedDocument)).verifiable();

            const actualWebsite = await testSubject.createWebsite(websiteData);
            expect(actualWebsite).toEqual(expectedDocument);
        });

        it('does not overwrite existing id', async () => {
            const websiteData = {
                name: 'test website',
                id: websiteId,
            } as DocumentDataOnly<Website>;

            const expectedDocument = getNormalizedDocument(websiteData);

            cosmosContainerClientMock.setup((c) => c.writeDocument(expectedDocument)).verifiable();

            const actualWebsite = await testSubject.createWebsite(websiteData);
            expect(actualWebsite).toEqual(expectedDocument);
        });
    });

    describe('updateWebsite', () => {
        it('throws if no id', () => {
            const websiteData: Partial<Website> = {
                name: 'test website',
            };

            expect(testSubject.updateWebsite(websiteData)).rejects.toThrow();
        });

        it('updates doc with normalized properties', async () => {
            const websiteData: Partial<Website> = {
                name: 'test website',
                id: websiteId,
            };
            const expectedDocument = getNormalizedDocument(websiteData);
            const updatedDocument = {
                name: 'updated test website',
                id: websiteId,
            } as Website;
            const response: CosmosOperationResponse<Website> = {
                statusCode: 200,
                item: updatedDocument,
            };

            cosmosContainerClientMock
                .setup((c) => c.mergeOrWriteDocument(expectedDocument))
                .returns(async () => response)
                .verifiable();

            await testSubject.updateWebsite(websiteData);
        });
    });

    describe('readWebsite', () => {
        it('reads website with id', async () => {
            const expectedWebsite = {
                name: 'test website',
            } as Website;
            const response = {
                statusCode: 200,
                item: expectedWebsite,
            } as CosmosOperationResponse<Website>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(websiteId, PartitionKey.websiteDocuments))
                .returns(async () => response)
                .verifiable();

            const actualWebsite = await testSubject.readWebsite(websiteId);

            expect(actualWebsite).toBe(expectedWebsite);
        });

        it('throws if unsuccessful status code', async () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<Website>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(websiteId, PartitionKey.websiteDocuments))
                .returns(async () => response)
                .verifiable();

            expect(testSubject.readWebsite(websiteId)).rejects.toThrow();
        });
    });

    function getNormalizedDocument(website: Partial<Website>): Partial<Website> {
        return {
            id: websiteId,
            itemType: ItemType.website,
            partitionKey: PartitionKey.websiteDocuments,
            ...website,
        };
    }
});
