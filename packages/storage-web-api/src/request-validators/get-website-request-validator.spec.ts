// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import { GuidGenerator } from 'common';
import { IMock, Mock } from 'typemoq';
import { GetWebsiteRequestValidator } from './get-website-request-validator';

describe(GetWebsiteRequestValidator, () => {
    const apiVersion = '1.0';
    const websiteId = 'website id';
    let context: Context;
    let guidGeneratorMock: IMock<GuidGenerator>;

    let testSubject: GetWebsiteRequestValidator;

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
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
            },
        });
        testSubject = new GetWebsiteRequestValidator(guidGeneratorMock.object);
    });

    it('rejects invalid api version', async () => {
        context.req.query['api-version'] = 'invalid api version';
        guidGeneratorMock.setup((gg) => gg.isValidV6Guid(websiteId)).returns(() => true);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('rejects empty website id', async () => {
        context.bindingData.websiteId = '';
        guidGeneratorMock.setup((gg) => gg.isValidV6Guid(websiteId)).returns(() => true);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('rejects invalid website guid', async () => {
        guidGeneratorMock.setup((gg) => gg.isValidV6Guid(websiteId)).returns(() => false);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('accepts request with valid guid', async () => {
        guidGeneratorMock.setup((gg) => gg.isValidV6Guid(websiteId)).returns(() => true);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });
});
