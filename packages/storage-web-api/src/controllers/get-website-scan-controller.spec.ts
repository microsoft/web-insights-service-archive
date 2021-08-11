// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as StorageDocuments from 'storage-documents';
import * as ApiContracts from 'api-contracts';
import { IMock, It, Mock } from 'typemoq';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { HttpResponse, PageProvider, PageScanProvider, WebApiErrorCodes, WebsiteScanProvider } from 'service-library';
import { Context } from '@azure/functions';
import { GetWebsiteScanRequestValidator, latestScanTag } from '../request-validators/get-website-scan-request-validator';
import { WebsiteScanDocumentResponseConverter } from '../converters/website-scan-document-response-converter';
import { mockCosmosQueryResults } from '../test-utilities/cosmos-query-results-iterable-mock';
import { GetWebsiteScanController } from './get-website-scan-controller';

describe(GetWebsiteScanController, () => {
    const websiteId = 'website id';
    const websiteScanId = 'website scan id';
    const scanType: StorageDocuments.ScanType = 'a11y';
    const websiteScanDocument = {
        id: websiteScanId,
        websiteId: websiteId,
        scanType: scanType,
    } as StorageDocuments.WebsiteScan;
    const websiteScanResponse = {
        id: websiteScanId,
        websiteId: websiteId,
        scanType: scanType,
        pageScans: [
            {
                id: 'page scan id',
                page: {
                    id: 'page id',
                    url: 'page url',
                },
            },
        ],
    } as ApiContracts.WebsiteScan;

    let serviceConfigMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let requestValidatorMock: IMock<GetWebsiteScanRequestValidator>;
    let websiteScanProviderMock: IMock<WebsiteScanProvider>;
    let pageScanProviderMock: IMock<PageScanProvider>;
    let pageProviderMock: IMock<PageProvider>;
    let convertWebsiteScanDocumentMock: IMock<WebsiteScanDocumentResponseConverter>;

    let context: Context;

    let testSubject: GetWebsiteScanController;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<Logger>();
        requestValidatorMock = Mock.ofType<GetWebsiteScanRequestValidator>();
        websiteScanProviderMock = Mock.ofType<WebsiteScanProvider>();
        pageScanProviderMock = Mock.ofType<PageScanProvider>();
        pageProviderMock = Mock.ofType<PageProvider>();
        convertWebsiteScanDocumentMock = Mock.ofType<WebsiteScanDocumentResponseConverter>();

        context = {
            bindingData: {
                websiteId: websiteId,
                scanType: scanType,
            },
        } as unknown as Context;

        testSubject = new GetWebsiteScanController(
            serviceConfigMock.object,
            loggerMock.object,
            requestValidatorMock.object,
            websiteScanProviderMock.object,
            pageScanProviderMock.object,
            pageProviderMock.object,
            convertWebsiteScanDocumentMock.object,
        );
        testSubject.context = context;
    });

    afterEach(() => {
        websiteScanProviderMock.verifyAll();
        pageScanProviderMock.verifyAll();
        convertWebsiteScanDocumentMock.verifyAll();
    });

    describe('With specific scan id', () => {
        beforeEach(() => {
            context.bindingData.scanIdOrLatest = websiteScanId;
        });

        it('returns resourceNotFound if cosmos returns 404', async () => {
            const cosmosResponse = { statusCode: 404 };

            websiteScanProviderMock.setup((wsp) => wsp.readWebsiteScan(websiteScanId, false)).returns(async () => cosmosResponse);

            await testSubject.handleRequest();

            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
        });

        it('returns internalError if cosmos returns a different error code', async () => {
            const cosmosResponse = { statusCode: 500 };

            websiteScanProviderMock.setup((wsp) => wsp.readWebsiteScan(websiteScanId, false)).returns(async () => cosmosResponse);

            await testSubject.handleRequest();

            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.internalError));
        });

        it('returns website scan if it exists', async () => {
            const pageScansIterableMock = mockCosmosQueryResults<StorageDocuments.PageScan>([]);
            const cosmosResponse = { statusCode: 200, item: websiteScanDocument };

            websiteScanProviderMock.setup((wsp) => wsp.readWebsiteScan(websiteScanId, false)).returns(async () => cosmosResponse);
            pageScanProviderMock
                .setup((psp) => psp.getAllPageScansForWebsiteScan(websiteScanId))
                .returns(() => pageScansIterableMock.object);
            convertWebsiteScanDocumentMock
                .setup((c) => c(websiteScanDocument, pageScansIterableMock.object, It.isAny()))
                .returns(async () => websiteScanResponse);

            await testSubject.handleRequest();

            expect(context.res.statusCode).toBe(200);
            expect(context.res.body).toEqual(websiteScanResponse);
        });
    });

    describe('with scanIdOrLatest=latest', () => {
        beforeEach(() => {
            context.bindingData.scanIdOrLatest = latestScanTag;
        });

        it('returns resourceNotFound if no scan is found', async () => {
            websiteScanProviderMock
                .setup((wsp) => wsp.getLatestScanForWebsite(websiteId, scanType))
                .returns(async () => null)
                .verifiable();

            await testSubject.handleRequest();

            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
        });

        it('returns latest scan of specified type', async () => {
            const pageScansIterableMock = mockCosmosQueryResults<StorageDocuments.PageScan>([]);

            websiteScanProviderMock
                .setup((wsp) => wsp.getLatestScanForWebsite(websiteId, scanType))
                .returns(async () => websiteScanDocument);
            pageScanProviderMock
                .setup((psp) => psp.getAllPageScansForWebsiteScan(websiteScanId))
                .returns(() => pageScansIterableMock.object);
            convertWebsiteScanDocumentMock
                .setup((c) => c(websiteScanDocument, pageScansIterableMock.object, It.isAny()))
                .returns(async () => websiteScanResponse);

            await testSubject.handleRequest();

            expect(context.res.statusCode).toBe(200);
            expect(context.res.body).toEqual(websiteScanResponse);
        });
    });
});
