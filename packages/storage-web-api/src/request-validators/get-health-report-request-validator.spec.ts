// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';
import 'reflect-metadata';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import { WebApiConfig } from '../web-api-config';

import { GetHealthReportRequestValidator } from './get-health-report-request-validator';

describe(GetHealthReportRequestValidator, () => {
    const releaseId = '1234';
    const apiVersion = '1.0';
    let webApiConfig: WebApiConfig;
    let context: Context;

    let testSubject: GetHealthReportRequestValidator;

    beforeEach(() => {
        webApiConfig = {
            releaseId: releaseId,
        };
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
            bindingData: {},
        });
        testSubject = new GetHealthReportRequestValidator(webApiConfig);
    });

    it('rejects invalid api version', async () => {
        context.req.query['api-version'] = 'invalid api version';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('rejects invalid scan target', async () => {
        context.bindingData.target = 'invalid target';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
    });

    it('rejects release request if releaseId is missing', async () => {
        context.bindingData.target = 'release';
        testSubject = new GetHealthReportRequestValidator({ releaseId: undefined } as WebApiConfig);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingReleaseId));
    });

    it('accepts request with undefined target', async () => {
        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });

    it('accepts release request without releaseId if releaseId exists in config', async () => {
        context.bindingData.target = 'release';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });

    it('accepts release request with releaseId', async () => {
        context.bindingData.target = 'release';
        context.bindingData.releaseId = '1234';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });
});
