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

    it('rejects request with no query parameters', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
            },
        });

        expect(testSubject.validateRequest(context)).toBeFalse();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingApiVersionQueryParameter));
    });

    it('rejects request with missing api version', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
                query: {},
            },
        });

        expect(testSubject.validateRequest(context)).toBeFalse();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingApiVersionQueryParameter));
    });

    it('rejects request with unsupported api version', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
                query: {
                    'api-version': 'unsupportedApiVersion',
                },
            },
        });

        expect(testSubject.validateRequest(context)).toBeFalse();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('Accepts GET request with supported api version', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
                query: {
                    'api-version': apiVersion,
                },
            },
        });

        expect(testSubject.validateRequest(context)).toBeTrue();
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

        it('rejects when there is no payload', () => {
            expect(testSubject.validateRequest(context)).toBeFalse();
            expect(context.res.status).toEqual(204);
        });

        it.each([undefined, '{}'])('rejects when payload=%s', (payload) => {
            context.req.rawBody = payload;

            expect(testSubject.validateRequest(context)).toBeFalse();
            expect(context.res.status).toEqual(204);
        });

        it('rejects when body is invalid JSON', () => {
            context.req.rawBody = 'invalid JSON string';

            expect(testSubject.validateRequest(context)).toBeFalse();
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidJsonDocument));
        });

        it.each([undefined, {}])('rejects with missingContentTypeHeader when headers=%s', (headers) => {
            context.req.rawBody = validPayload;
            context.req.headers = headers;

            expect(testSubject.validateRequest(context)).toBeFalse();
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingContentTypeHeader));
        });

        it("rejects if content type is not 'application/json'", () => {
            context.req.rawBody = validPayload;
            context.req.headers = {
                'content-type': 'text/plain',
            };

            expect(testSubject.validateRequest(context)).toBeFalse();
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedContentType));
        });

        it('accepts request with valid payload and correct content type', () => {
            context.req.rawBody = validPayload;
            context.req.headers = {
                'content-type': 'application/json',
            };

            expect(testSubject.validateRequest(context)).toBeTrue();
        });
    });
});
