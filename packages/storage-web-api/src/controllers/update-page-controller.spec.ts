// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { HttpResponse, PageProvider, WebApiErrorCodes } from 'service-library';
import { Context } from '@azure/functions';
import { PageDocumentResponseConverter } from '../converters/page-document-response-converter';
import { UpdatePageRequestValidator } from '../request-validators/update-page-request-validator';
import { UpdatePageController } from './update-page-controller';

describe(UpdatePageController, () => {
    const pageId = 'page';
    const pageDocument: StorageDocuments.Page = {
        id: pageId,
        url: 'page url',
        websiteId: 'website id',
        partitionKey: 'partition key',
        itemType: StorageDocuments.itemTypes.page,
    };
    const pageUpdate: ApiContracts.PageUpdate = {
        pageId: pageId,
        disabledScans: ['a11y'],
    };
    const convertedPageDoc: ApiContracts.Page = {
        id: pageId,
        url: 'page url',
        disabledScans: pageUpdate.disabledScans,
    };

    let serviceConfigMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<ContextAwareLogger>;
    let requestValidatorMock: IMock<UpdatePageRequestValidator>;
    let pageProviderMock: IMock<PageProvider>;
    let pageDocumentResponseConverterMock: IMock<PageDocumentResponseConverter>;
    let context: Context;

    let testSubject: UpdatePageController;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<ContextAwareLogger>();
        requestValidatorMock = Mock.ofType<UpdatePageRequestValidator>();
        pageProviderMock = Mock.ofType<PageProvider>();
        pageDocumentResponseConverterMock = Mock.ofType<PageDocumentResponseConverter>();

        pageDocumentResponseConverterMock.setup((c) => c(pageDocument)).returns(() => convertedPageDoc);

        context = <Context>(<unknown>{
            req: {
                rawBody: JSON.stringify(pageUpdate),
            },
        });

        testSubject = new UpdatePageController(
            serviceConfigMock.object,
            loggerMock.object,
            requestValidatorMock.object,
            pageProviderMock.object,
            pageDocumentResponseConverterMock.object,
        );
        testSubject.context = context;
    });

    afterEach(() => {
        pageProviderMock.verifyAll();
    });

    it('Returns error if page document does not exist', async () => {
        const error = new Error('test error');
        pageProviderMock.setup((p) => p.readPage(pageId)).throws(error);

        await testSubject.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
    });

    it('Updates page doc if it exists', async () => {
        pageProviderMock.setup((p) => p.readPage(pageId)).returns(async () => pageDocument);
        pageProviderMock
            .setup((p) => p.updatePage({ id: pageId, disabledScans: pageUpdate.disabledScans }))
            .returns(async () => pageDocument)
            .verifiable();

        await testSubject.handleRequest();

        expect(context.res.status).toBe(200);
        expect(context.res.body).toEqual(convertedPageDoc);
    });
});
