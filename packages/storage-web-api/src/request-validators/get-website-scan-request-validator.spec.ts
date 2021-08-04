// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { Context } from '@azure/functions';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import { GuidGenerator } from 'common';
import { IMock, Mock } from 'typemoq';
import { ScanType } from 'storage-documents';
import { GetWebsiteScanRequestValidator, latestScanTarget } from './get-website-scan-request-validator';

describe(GetWebsiteScanRequestValidator, () => {
    const apiVersion = '1.0';
    const websiteId = 'website id';
    const scanType = 'scan type' as StorageDocuments.ScanType;
    const scanId = 'scan id';
    let context: Context;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let isValidScanTypeMock: IMock<ApiContracts.ApiObjectValidator<ScanType>>;
    let websiteIdIsValid: boolean;
    let scanIdIsValid: boolean;
    let scanTypeIsValid: boolean;

    let testSubject: GetWebsiteScanRequestValidator;

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        isValidScanTypeMock = Mock.ofInstance(() => null);
        context = <Context>(<unknown>{
            req: {
                url: 'baseUrl/websites',
                method: 'GET',
                headers: {
                    'content-type': 'application/json',
                },
                query: {
                    'api-version': apiVersion,
                },
            },
            bindingData: {
                websiteId: websiteId,
                scanType: scanType,
                scanTarget: scanId,
            },
        });
        websiteIdIsValid = true;
        scanIdIsValid = true;
        scanTypeIsValid = true;
        guidGeneratorMock.setup((gg) => gg.isValidV6Guid(websiteId)).returns(() => websiteIdIsValid);
        guidGeneratorMock.setup((gg) => gg.isValidV6Guid(scanId)).returns(() => scanIdIsValid);
        isValidScanTypeMock.setup((o) => o(scanType)).returns(() => scanTypeIsValid);

        testSubject = new GetWebsiteScanRequestValidator(guidGeneratorMock.object, isValidScanTypeMock.object);
    });

    it('rejects invalid api version', async () => {
        context.req.query['api-version'] = 'invalid api version';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('rejects empty website id', async () => {
        context.bindingData.websiteId = '';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('rejects invalid website guid', async () => {
        websiteIdIsValid = false;

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('rejects empty scan id', async () => {
        context.bindingData.scanTarget = '';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('rejects invalid scan guid', async () => {
        scanIdIsValid = false;

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('rejects invalid scan type', async () => {
        scanTypeIsValid = false;

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidScanType));
    });

    it('accepts request with valid guids and scan type', async () => {
        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });

    it('accepts request with scan target="latest" and valid scan type', async () => {
        context.bindingData.scanTarget = latestScanTarget;

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });
});
