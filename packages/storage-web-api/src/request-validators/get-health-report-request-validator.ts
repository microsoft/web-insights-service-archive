// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';
import { inject, injectable } from 'inversify';
import { ApiRequestValidator, HttpResponse, WebApiErrorCodes } from 'service-library';
import { WebApiConfig } from '../web-api-config';

export declare type HealthTarget = 'release' | undefined;

@injectable()
export class GetHealthReportRequestValidator extends ApiRequestValidator {
    protected readonly apiVersions = ['1.0'];

    constructor(@inject(WebApiConfig) private readonly webApiConfig: WebApiConfig) {
        super();
    }

    public async validateRequest(context: Context): Promise<boolean> {
        if (!(await super.validateRequest(context))) {
            return false;
        }

        const target: HealthTarget = context.bindingData.target as HealthTarget;
        if (target !== undefined) {
            if (target !== 'release') {
                context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);

                return false;
            }
            if (this.webApiConfig.releaseId === undefined && context.bindingData.releaseId === undefined) {
                context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.missingReleaseId);

                return false;
            }
        }

        return true;
    }
}
