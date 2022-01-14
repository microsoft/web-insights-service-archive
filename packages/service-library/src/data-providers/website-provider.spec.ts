// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { DocumentDataOnly, itemTypes, PartitionKey, Website } from 'storage-documents';
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

    describe('deleteWebsite', () => {
        it('deletes document', async () => {
            cosmosContainerClientMock.setup((c) => c.deleteDocument(websiteId, PartitionKey.websiteDocuments)).verifiable();

            await testSubject.deleteWebsite(websiteId);
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
                .setup((c) => c.mergeOrWriteDocument(expectedDocument, PartitionKey.websiteDocuments, true, It.isAny()))
                .returns(async () => response)
                .verifiable();

            await testSubject.updateWebsite(websiteData);
        });

        describe('merges array properties', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let mergeCustomizer: (target: any, source: any, key: string) => any;

            beforeEach(async () => {
                cosmosContainerClientMock
                    .setup((c) => c.mergeOrWriteDocument(It.isAny(), PartitionKey.websiteDocuments, true, It.isAny()))
                    .callback(async (_doc, _partitionKey, _throwOnError, customizer) => {
                        mergeCustomizer = customizer;
                    })
                    .returns(async () => ({ item: {} } as CosmosOperationResponse<Website>));

                await testSubject.updateWebsite({ id: websiteId });
            });

            it('deduplicates and merges knownPages', () => {
                const target = ['page1', 'page2'];
                const source = ['page2', 'page3'];
                const expectedArray = ['page1', 'page2', 'page3'];

                expect(mergeCustomizer(target, source, 'knownPages')).toEqual(expectedArray);
            });

            it('returns undefined for other properties', () => {
                const target = 'old baseUrl';
                const source = 'new baseUrl';

                expect(mergeCustomizer(target, source, 'baseUrl')).toBeUndefined();
            });
        });
    });

    describe('readWebsite', () => {
        it.each([true, false])('reads website with throwIfNotSuccess=%s', async (throwIfNotSuccess) => {
            const websiteDocument = {
                name: 'test website',
            } as Website;
            const expectedResponse = {
                statusCode: 200,
                item: websiteDocument,
            } as CosmosOperationResponse<Website>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(websiteId, PartitionKey.websiteDocuments, throwIfNotSuccess))
                .returns(async () => expectedResponse)
                .verifiable();

            const actualResponse = await testSubject.readWebsite(websiteId, throwIfNotSuccess);

            expect(actualResponse).toEqual(expectedResponse);
        });
    });

    function getNormalizedDocument(website: Partial<Website>): Partial<Website> {
        return {
            id: websiteId,
            itemType: itemTypes.website,
            partitionKey: PartitionKey.websiteDocuments,
            ...website,
        };
    }
});
