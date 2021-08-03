// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { IMock, Mock } from 'typemoq';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { CosmosQueryResultsIterable, HttpResponse, PageProvider, WebApiErrorCodes, WebsiteProvider } from 'service-library';
import { Context } from '@azure/functions';
import * as StorageDocuments from 'storage-documents';
import { WebsiteDocumentResponseConverter } from '../converters/website-document-response-converter';
import { GetWebsiteRequestValidator } from '../request-validators/get-website-request-validator';
import { GetWebsiteController } from './get-website-controller';

describe(GetWebsiteController, () => {
    const websiteId = 'website id';
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<ContextAwareLogger>;
    let requestValidatorMock: IMock<GetWebsiteRequestValidator>;
    let websiteProviderMock: IMock<WebsiteProvider>;
    let pageProviderMock: IMock<PageProvider>;
    let websiteDocumentResponseConverterMock: IMock<WebsiteDocumentResponseConverter>;
    let context: Context;

    let testSubject: GetWebsiteController;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<ContextAwareLogger>();
        requestValidatorMock = Mock.ofType<GetWebsiteRequestValidator>();
        websiteProviderMock = Mock.ofType<WebsiteProvider>();
        pageProviderMock = Mock.ofType<PageProvider>();
        websiteDocumentResponseConverterMock = Mock.ofType<WebsiteDocumentResponseConverter>();

        context = <Context>(<unknown>{
            req: {},
            bindingData: {
                websiteId,
            },
        });

        testSubject = new GetWebsiteController(
            serviceConfigMock.object,
            loggerMock.object,
            requestValidatorMock.object,
            websiteProviderMock.object,
            pageProviderMock.object,
            websiteDocumentResponseConverterMock.object,
        );
        testSubject.context = context;
    });

    it.each([undefined, ''])('Returns invalidResourceId response if websiteId=%s', async (websiteIdValue) => {
        context.bindingData.websiteId = websiteIdValue;

        await testSubject.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('return resourceNotFound response if website doc does not exist', async () => {
        const testError = new Error('test errors');
        websiteProviderMock.setup((w) => w.readWebsite(websiteId)).throws(testError);

        await testSubject.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
    });

    it('return 200 if documents were successfully fetched', async () => {
        const websiteStub = {
            baseUrl: 'baseUrl',
            name: 'test website',
        } as StorageDocuments.Website;
        const pageIterableMock = Mock.ofType<CosmosQueryResultsIterable<StorageDocuments.Page>>();
        const expectedResponseBody = {
            ...websiteStub,
            id: websiteId,
            pages: [],
        } as ApiContracts.Website;

        websiteProviderMock.setup((w) => w.readWebsite(websiteId)).returns(async () => websiteStub);
        pageProviderMock.setup((p) => p.getPagesForWebsite(websiteId)).returns(() => pageIterableMock.object);
        websiteDocumentResponseConverterMock
            .setup((c) => c(websiteStub, pageIterableMock.object))
            .returns(async () => expectedResponseBody);

        await testSubject.handleRequest();

        expect(context.res.body).toEqual(expectedResponseBody);
        expect(context.res.status).toBe(200);
    });
});
