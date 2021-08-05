// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import { GetWebsiteRequestValidator } from './get-website-request-validator';

describe(GetWebsiteRequestValidator, () => {
    const apiVersion = '1.0';
    let context: Context;

    let testSubject: GetWebsiteRequestValidator;

    beforeEach(() => {
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
        });
        testSubject = new GetWebsiteRequestValidator();
    });

    it('rejects invalid api version', async () => {
        context.req.query['api-version'] = 'invalid api version';

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });
});
