// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { IMock, Mock, MockBehavior } from 'typemoq';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { CosmosQueryResultsIterable, PageProvider, WebsiteProvider } from 'service-library';
import { Context } from '@azure/functions';
import { WebsiteDocumentResponseConverter } from '../converters/website-document-response-converter';
import { PageDocumentResponseConverter } from '../converters/page-document-response-converter';
import { PostWebsiteRequestValidator } from '../request-validators/post-website-request-validator';
import { PostWebsiteController } from './post-website-controller';

describe(PostWebsiteController, () => {
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
    let requestValidatorMock: IMock<PostWebsiteRequestValidator>;
    let websiteProviderMock: IMock<WebsiteProvider>;
    let pageProviderMock: IMock<PageProvider>;
    let websiteDocumentResponseConverterMock: IMock<WebsiteDocumentResponseConverter>;
    let pageDocumentResponseConverterMock: IMock<PageDocumentResponseConverter>;
    let context: Context;
    let pageIterableMock: IMock<CosmosQueryResultsIterable<StorageDocuments.Page>>;

    let testSubject: PostWebsiteController;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<ContextAwareLogger>();
        requestValidatorMock = Mock.ofType<PostWebsiteRequestValidator>();
        websiteProviderMock = Mock.ofType(WebsiteProvider, MockBehavior.Strict);
        pageProviderMock = Mock.ofType<PageProvider>();
        websiteDocumentResponseConverterMock = Mock.ofType<WebsiteDocumentResponseConverter>();
        pageDocumentResponseConverterMock = Mock.ofType<PageDocumentResponseConverter>();
        pageIterableMock = Mock.ofType<CosmosQueryResultsIterable<StorageDocuments.Page>>();

        pageProviderMock.setup((p) => p.getPagesForWebsite(websiteId)).returns(() => pageIterableMock.object);
        websiteDocumentResponseConverterMock
            .setup((c) => c(websiteDocument, pageIterableMock.object))
            .returns(async () => convertedWebsiteDoc);

        context = <Context>(<unknown>{
            req: {},
        });
        convertedWebsiteDoc = {
            id: websiteId,
            pages: pages,
        } as ApiContracts.Website;

        testSubject = new PostWebsiteController(
            serviceConfigMock.object,
            loggerMock.object,
            requestValidatorMock.object,
            websiteProviderMock.object,
            pageProviderMock.object,
            websiteDocumentResponseConverterMock.object,
            pageDocumentResponseConverterMock.object,
        );
        testSubject.context = context;
    });

    afterEach(() => {
        websiteProviderMock.verifyAll();
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

        await testSubject.handleRequest();

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

        await testSubject.handleRequest();

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

        await testSubject.handleRequest();

        expect(context.res.status).toBe(201);
        expect(context.res.body).toEqual(expectedResponseBody);
    });
});
