// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ApiRequestValidator, HttpResponse, WebApiErrorCodes } from 'service-library';
import { GuidGenerator } from 'common';

@injectable()
export class GetWebsiteRequestValidator extends ApiRequestValidator {
    protected readonly apiVersions = ['1.0'];

    constructor(@inject(GuidGenerator) private readonly guidGenerator: GuidGenerator) {
        super();
    }

    public async validateRequest(context: Context): Promise<boolean> {
        if (!(await super.validateRequest(context))) {
            return false;
        }

        const websiteId = context.bindingData.websiteId as string;
        if (_.isEmpty(websiteId) || !this.guidGenerator.isValidV6Guid(websiteId)) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);

            return false;
        }

        return true;
    }
}
