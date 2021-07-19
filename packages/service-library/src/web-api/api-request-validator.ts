// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';
import _ from 'lodash';
import { HttpResponse } from './http-response';
import { WebApiErrorCodes } from './web-api-error-codes';
import { WebRequestValidator } from './web-request-validator';

export class ApiRequestValidator implements WebRequestValidator {
    constructor(protected readonly apiVersions: string[]) {}

    public validateRequest(context: Context): boolean {
        if (!this.validateApiVersion(context) || !this.validateContentType(context)) {
            return false;
        }

        return true;
    }

    protected validateContentType(context: Context): boolean {
        if (context.req.method !== 'POST' && context.req.method !== 'PUT') {
            return true;
        }

        if (!this.hasPayload(context)) {
            context.res = context.res || {
                status: 204, // No Content
            };

            return false;
        }

        if (context.req.headers === undefined || context.req.headers['content-type'] === undefined) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.missingContentTypeHeader);

            return false;
        }

        if (context.req.headers['content-type'] !== 'application/json') {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedContentType);

            return false;
        }

        return true;
    }

    protected validateApiVersion(context: Context): boolean {
        if (context.req.query === undefined || context.req.query['api-version'] === undefined) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.missingApiVersionQueryParameter);

            return false;
        }

        if (!this.apiVersions.includes(context.req.query['api-version'])) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion);

            return false;
        }

        return true;
    }

    protected hasPayload(context: Context): boolean {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return context.req.rawBody !== undefined && !_.isEmpty(this.tryGetPayload<any>(context));
    }

    /**
     * Try parse a JSON string from the HTTP request body.
     * Will return undefined if parsing was unsuccessful; otherwise object representation of a JSON string.
     */
    protected tryGetPayload<T>(context: Context): T {
        try {
            return JSON.parse(context.req.rawBody);
        } catch (error) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidJsonDocument);
        }

        return undefined;
    }
}
