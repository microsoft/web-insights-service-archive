// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ApiRequestValidator } from './api-request-validator';
import { HttpResponse } from './http-response';
import { WebApiErrorCodes } from './web-api-error-codes';

describe(ApiRequestValidator, () => {
    const apiVersion = 'apiVersion';

    let testSubject: ApiRequestValidator;

    class TestableApiRequestValidator extends ApiRequestValidator {
        protected readonly apiVersions = [apiVersion];
    }

    beforeEach(() => {
        testSubject = new TestableApiRequestValidator();
    });

    it('rejects request with no query parameters', async () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
            },
        });

        expect(await testSubject.validateRequest(context)).toEqual(false);
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingApiVersionQueryParameter));
    });

    it('rejects request with missing api version', async () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
                query: {},
            },
        });

        expect(await testSubject.validateRequest(context)).toEqual(false);
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingApiVersionQueryParameter));
    });

    it('rejects request with unsupported api version', async () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
                query: {
                    'api-version': 'unsupportedApiVersion',
                },
            },
        });

        expect(await testSubject.validateRequest(context)).toEqual(false);
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('Accepts GET request with supported api version', async () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
                query: {
                    'api-version': apiVersion,
                },
            },
        });

        expect(await testSubject.validateRequest(context)).toEqual(true);
    });

    describe.each(['POST', 'PUT'])('%s request', (method) => {
        let context: Context;
        const validPayload = JSON.stringify({ id: 'testId' });

        beforeEach(() => {
            context = <Context>(<unknown>{
                req: {
                    method: method,
                    query: {
                        'api-version': apiVersion,
                    },
                },
            });
        });

        it('rejects when there is no payload', async () => {
            expect(await testSubject.validateRequest(context)).toEqual(false);
            expect(context.res.status).toEqual(204);
        });

        it.each([undefined, '{}'])('rejects when payload=%s', async (payload) => {
            context.req.rawBody = payload;

            expect(await testSubject.validateRequest(context)).toEqual(false);
            expect(context.res.status).toEqual(204);
        });

        it('rejects when body is invalid JSON', async () => {
            context.req.rawBody = 'invalid JSON string';

            expect(await testSubject.validateRequest(context)).toEqual(false);
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidJsonDocument));
        });

        it.each([undefined, {}])('rejects with missingContentTypeHeader when headers=%s', async (headers) => {
            context.req.rawBody = validPayload;
            context.req.headers = headers;

            expect(await testSubject.validateRequest(context)).toEqual(false);
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingContentTypeHeader));
        });

        it("rejects if content type is not 'application/json'", async () => {
            context.req.rawBody = validPayload;
            context.req.headers = {
                'content-type': 'text/plain',
            };

            expect(await testSubject.validateRequest(context)).toEqual(false);
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedContentType));
        });

        it('accepts request with valid payload and correct content type', async () => {
            context.req.rawBody = validPayload;
            context.req.headers = {
                'content-type': 'application/json',
            };

            expect(await testSubject.validateRequest(context)).toEqual(true);
        });
    });
});
