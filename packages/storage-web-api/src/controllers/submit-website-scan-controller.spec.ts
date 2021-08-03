// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { IMock, Mock } from 'typemoq';
import { Logger } from 'logger';
import { ServiceConfiguration } from 'common';
import { Context } from '@azure/functions';
import { HttpResponse, WebApiErrorCodes, WebsiteProvider, WebsiteScanProvider } from 'service-library';
import * as StorageDocuments from 'storage-documents';
import { SubmitWebsiteScanRequestValidator } from '../request-validators/submit-website-scan-request-validator';
import { WebsiteScanDocumentResponseConverter } from '../converters/website-scan-document-response-converter';
import { SubmitWebsiteScanController } from './submit-website-scan-controller';

describe(SubmitWebsiteScanController, () => {
    const websiteId = 'website id';
    const websiteScanDocument = {
        id: 'website scan id',
        scanStatus: 'pending',
        partitionKey: 'partition key',
    } as StorageDocuments.WebsiteScan;
    const websiteScanResponse = {
        id: 'website scan id',
        scanStatus: 'pending',
    } as ApiContracts.WebsiteScan;

    let loggerMock: IMock<Logger>;
    let requestValidatorMock: IMock<SubmitWebsiteScanRequestValidator>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let websiteProviderMock: IMock<WebsiteProvider>;
    let websiteScanProviderMock: IMock<WebsiteScanProvider>;
    let convertWebsiteScanMock: IMock<WebsiteScanDocumentResponseConverter>;

    let websiteScanRequest: ApiContracts.WebsiteScanRequest;
    let context: Context;

    let testSubject: SubmitWebsiteScanController;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        requestValidatorMock = Mock.ofType<SubmitWebsiteScanRequestValidator>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        websiteProviderMock = Mock.ofType<WebsiteProvider>();
        websiteScanProviderMock = Mock.ofType<WebsiteScanProvider>();
        convertWebsiteScanMock = Mock.ofType<WebsiteScanDocumentResponseConverter>();

        websiteScanRequest = {
            websiteId: websiteId,
            scanType: 'a11y',
        };

        context = <Context>(<unknown>{
            req: {},
        });

        testSubject = new SubmitWebsiteScanController(
            serviceConfigMock.object,
            loggerMock.object,
            requestValidatorMock.object,
            websiteProviderMock.object,
            websiteScanProviderMock.object,
            convertWebsiteScanMock.object,
        );
        testSubject.context = context;
    });

    it('returns 404 if requested website does not exist', async () => {
        const testError = new Error('test error');
        context.req.rawBody = JSON.stringify(websiteScanRequest);

        websiteProviderMock.setup((wp) => wp.readWebsite(websiteId)).throws(testError);

        await testSubject.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
    });

    it('creates new website scan document with specified frequency and priority', async () => {
        websiteScanRequest.scanFrequency = 'scan frequency expression';
        context.req.rawBody = JSON.stringify(websiteScanRequest);

        websiteProviderMock.setup((wp) => wp.readWebsite(websiteId)).returns(async () => ({} as StorageDocuments.Website));
        websiteScanProviderMock
            .setup((wsp) =>
                wsp.createScanDocumentForWebsite(websiteId, websiteScanRequest.scanType, websiteScanRequest.scanFrequency, undefined),
            )
            .returns(async () => websiteScanDocument)
            .verifiable();
        convertWebsiteScanMock.setup((c) => c(websiteScanDocument)).returns(async () => websiteScanResponse);

        await testSubject.handleRequest();

        expect(context.res.status).toBe(201);
        expect(context.res.body).toEqual(websiteScanResponse);
    });
});
