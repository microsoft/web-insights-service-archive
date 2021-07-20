// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { GuidGenerator, ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { CosmosQueryResultsIterable, HttpResponse, PageProvider, WebApiErrorCodes, WebsiteProvider } from 'service-library';
import { Context } from '@azure/functions';
import { WebsiteDocumentResponseConverter } from '../converters/website-document-response-converter';
import { PageDocumentResponseConverter } from '../converters/page-document-response-converter';
import { PostWebsiteController } from './post-website-controller';

describe(PostWebsiteController, () => {
    const apiVersion = '1.0';
    const websiteId = 'websiteId';
    const websiteDocument: StorageDocuments.Website = {
        ...ApiContracts.websiteWithRequiredProperties,
        id: websiteId,
        partitionKey: 'partition key',
        itemType: StorageDocuments.itemTypes.website,
    };
    const pages: ApiContracts.Page[] = [
        {
            id: 'page 1 id',
            url: ApiContracts.websiteWithRequiredProperties.knownPages[0],
        },
    ];
    let convertedWebsiteDoc: ApiContracts.Website;

    let serviceConfigMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<ContextAwareLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let websiteProviderMock: IMock<WebsiteProvider>;
    let pageProviderMock: IMock<PageProvider>;
    let isValidWebsiteMock: IMock<typeof ApiContracts.isValidWebsiteObject>;
    let websiteDocumentResponseConverterMock: IMock<WebsiteDocumentResponseConverter>;
    let pageDocumentResponseConverterMock: IMock<PageDocumentResponseConverter>;
    let context: Context;
    let pageIterableMock: IMock<CosmosQueryResultsIterable<StorageDocuments.Page>>;

    let testSubject: PostWebsiteController;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<ContextAwareLogger>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        websiteProviderMock = Mock.ofType(WebsiteProvider, MockBehavior.Strict);
        pageProviderMock = Mock.ofType<PageProvider>();
        isValidWebsiteMock = Mock.ofType<typeof ApiContracts.isValidWebsiteObject>();
        websiteDocumentResponseConverterMock = Mock.ofType<WebsiteDocumentResponseConverter>();
        pageDocumentResponseConverterMock = Mock.ofType<PageDocumentResponseConverter>();
        pageIterableMock = Mock.ofType<CosmosQueryResultsIterable<StorageDocuments.Page>>();

        isValidWebsiteMock.setup((f) => f(It.isAny())).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteId)).returns(() => true);
        pageProviderMock.setup((p) => p.getPagesForWebsite(websiteId)).returns(() => pageIterableMock.object);
        websiteDocumentResponseConverterMock
            .setup((c) => c(websiteDocument, pageIterableMock.object))
            .returns(async () => convertedWebsiteDoc);

        context = <Context>(<unknown>{
            req: {
                url: 'baseUrl/websites',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                query: {
                    'api-version': apiVersion,
                },
                rawBody: JSON.stringify(ApiContracts.websiteWithRequiredProperties),
            },
        });
        convertedWebsiteDoc = {
            id: websiteId,
            pages: pages,
        } as ApiContracts.Website;

        testSubject = new PostWebsiteController(
            serviceConfigMock.object,
            loggerMock.object,
            guidGeneratorMock.object,
            websiteProviderMock.object,
            pageProviderMock.object,
            isValidWebsiteMock.object,
            websiteDocumentResponseConverterMock.object,
            pageDocumentResponseConverterMock.object,
        );
        testSubject.context = context;
    });

    afterEach(() => {
        websiteProviderMock.verifyAll();
    });

    describe('Rejects invalid inputs', () => {
        it('if website does not match interface', async () => {
            const malformedWebsite = { invalidProperty: 'value' } as unknown as ApiContracts.Website;
            isValidWebsiteMock.reset();
            isValidWebsiteMock.setup((o) => o(malformedWebsite)).returns(() => false);

            context.req.rawBody = JSON.stringify(malformedWebsite);

            await testSubject.invoke(context);
            expect(context.res).toMatchObject(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
        });

        it('if website has an invalid id', async () => {
            const websiteRequest = {
                ...ApiContracts.websiteWithRequiredProperties,
                id: websiteId,
            };
            guidGeneratorMock.reset();
            guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteId)).returns(() => false);
            isValidWebsiteMock.setup((o) => o(websiteRequest)).returns(() => true);

            context.req.rawBody = JSON.stringify(websiteRequest);

            await testSubject.invoke(context);
            expect(context.res).toMatchObject(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
        });

        it('if website contains pages field', async () => {
            const websiteRequest = {
                ...ApiContracts.websiteWithRequiredProperties,
                pages: [
                    {
                        id: 'page id',
                        url: 'page url',
                    },
                ],
            };
            isValidWebsiteMock.setup((o) => o(websiteRequest)).returns(() => true);

            context.req.rawBody = JSON.stringify(websiteRequest);

            await testSubject.invoke(context);
            expect(context.res).toMatchObject(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
        });
    });

    it('Creates a new document if no id is given', async () => {
        const websiteRequest: ApiContracts.Website = {
            ...ApiContracts.websiteWithRequiredProperties,
            knownPages: [],
        };
        context.req.rawBody = JSON.stringify(websiteRequest);

        websiteProviderMock
            .setup((w) => w.createWebsite(websiteRequest))
            .returns(async () => websiteDocument)
            .verifiable();

        await testSubject.invoke(context);

        expect(context.res.status).toBe(201);
        expect(context.res.body).toEqual(convertedWebsiteDoc);
    });

    it('Upserts doc if id is present', async () => {
        const websiteRequest: ApiContracts.Website = {
            ...ApiContracts.websiteWithRequiredProperties,
            knownPages: [],
            id: websiteId,
        };
        context.req.rawBody = JSON.stringify(websiteRequest);

        websiteProviderMock
            .setup((w) => w.updateWebsite(websiteRequest))
            .returns(async () => websiteDocument)
            .verifiable();

        await testSubject.invoke(context);

        expect(context.res.status).toBe(200);
        expect(context.res.body).toEqual(convertedWebsiteDoc);
    });

    it('Creates new page documents if urls were added to knownPages', async () => {
        const newPageUrl = 'new page url';
        const newPageDocument = {
            id: 'new page id',
            url: newPageUrl,
            partitionKey: 'partition key',
        } as StorageDocuments.Page;
        const newPageObj = {
            id: newPageDocument.id,
            url: newPageDocument.url,
        };

        const updatedKnownPages = [...ApiContracts.websiteWithRequiredProperties.knownPages, newPageUrl];
        const websiteRequest = {
            ...ApiContracts.websiteWithRequiredProperties,
            knownPages: updatedKnownPages,
            id: websiteId,
        };
        context.req.rawBody = JSON.stringify(websiteRequest);

        convertedWebsiteDoc.knownPages = updatedKnownPages;
        const expectedResponseBody = {
            ...convertedWebsiteDoc,
            pages: [...convertedWebsiteDoc.pages, newPageObj],
        };

        websiteProviderMock
            .setup((w) => w.updateWebsite(websiteRequest))
            .returns(async () => websiteDocument)
            .verifiable();
        pageProviderMock.setup((p) => p.createPageForWebsite(newPageUrl, websiteId)).returns(async () => newPageDocument);
        pageDocumentResponseConverterMock.setup((c) => c(newPageDocument)).returns(() => newPageObj);

        await testSubject.invoke(context);

        expect(context.res.status).toBe(201);
        expect(context.res.body).toEqual(expectedResponseBody);
    });
});
