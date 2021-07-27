// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RestApiConfig, ServiceConfiguration } from 'common';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { HttpResponse } from './http-response';
import { WebApiErrorCodes } from './web-api-error-codes';
import { WebController } from './web-controller';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export abstract class ApiController extends WebController {
    protected abstract readonly serviceConfig: ServiceConfiguration;

    public hasPayload(): boolean {
        return this.context.req.rawBody !== undefined && !isEmpty(this.tryGetPayload<any>());
    }

    /**
     * Try parse a JSON string from the HTTP request body.
     * Will return undefined if parsing was unsuccessful; otherwise object representation of a JSON string.
     */
    public tryGetPayload<T>(): T {
        try {
            return JSON.parse(this.context.req.rawBody);
        } catch (error) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidJsonDocument);
        }

        return undefined;
    }

    protected async getRestApiConfig(): Promise<RestApiConfig> {
        return this.serviceConfig.getConfigValue('restApiConfig');
    }
}
