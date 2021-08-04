// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { IMock, Mock } from 'typemoq';
import { Logger } from 'logger';
import { RestApiConfig, ServiceConfiguration } from 'common';
import { Context } from '@azure/functions';
import { HttpResponse, WebApiErrorCodes, WebsiteProvider, WebsiteScanProvider } from 'service-library';
import * as StorageDocuments from 'storage-documents';
import { PostWebsiteScanRequestValidator } from '../request-validators/post-website-scan-request-validator';
import { WebsiteScanDocumentResponseConverter } from '../converters/website-scan-document-response-converter';
import { PostWebsiteScanController } from './post-website-scan-controller';

describe(PostWebsiteScanController, () => {
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
    const websiteStub = {
        id: websiteId,
        priority: 10,
    } as StorageDocuments.Website;
    const restApiConfigStub = {
        defaultA11yScanFrequency: 'default a11y scan frequency',
    } as RestApiConfig;

    let loggerMock: IMock<Logger>;
    let requestValidatorMock: IMock<PostWebsiteScanRequestValidator>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let websiteProviderMock: IMock<WebsiteProvider>;
    let websiteScanProviderMock: IMock<WebsiteScanProvider>;
    let convertWebsiteScanMock: IMock<WebsiteScanDocumentResponseConverter>;

    let websiteScanRequest: ApiContracts.WebsiteScanRequest;
    let context: Context;

    let testSubject: PostWebsiteScanController;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        requestValidatorMock = Mock.ofType<PostWebsiteScanRequestValidator>();
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

        serviceConfigMock.setup((sc) => sc.getConfigValue('restApiConfig')).returns(async () => restApiConfigStub);

        testSubject = new PostWebsiteScanController(
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
        websiteScanRequest.priority = 10;
        context.req.rawBody = JSON.stringify(websiteScanRequest);

        setupPostScanRequest(websiteScanRequest.scanFrequency, websiteScanRequest.priority);

        await testSubject.handleRequest();

        expect(context.res.status).toBe(201);
        expect(context.res.body).toEqual(websiteScanResponse);
    });

    it('creates new website scan document with default frequency and priority', async () => {
        context.req.rawBody = JSON.stringify(websiteScanRequest);

        setupPostScanRequest(restApiConfigStub.defaultA11yScanFrequency, websiteStub.priority);

        await testSubject.handleRequest();

        expect(context.res.status).toBe(201);
        expect(context.res.body).toEqual(websiteScanResponse);
    });

    function setupPostScanRequest(frequency: string, priority: number): void {
        websiteProviderMock.setup((wp) => wp.readWebsite(websiteId)).returns(async () => websiteStub);
        websiteScanProviderMock
            .setup((wsp) => wsp.createScanDocumentForWebsite(websiteId, websiteScanRequest.scanType, frequency, priority))
            .returns(async () => websiteScanDocument)
            .verifiable();
        convertWebsiteScanMock.setup((c) => c(websiteScanDocument)).returns(async () => websiteScanResponse);
    }
});
