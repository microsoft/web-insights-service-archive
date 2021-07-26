// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { Context } from '@azure/functions';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { GuidGenerator } from 'common';
import { ApiRequestValidator, HttpResponse, WebApiErrorCodes } from 'service-library';

@injectable()
export class PostWebsiteRequestValidator extends ApiRequestValidator {
    public static readonly apiVersions = ['1.0'];

    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        private readonly isValidWebsiteObject: typeof ApiContracts.isValidWebsiteObject = ApiContracts.isValidWebsiteObject,
    ) {
        super(PostWebsiteRequestValidator.apiVersions);
    }

    public validateRequest(context: Context): boolean {
        if (!super.validateRequest(context)) {
            return false;
        }

        const payload = this.tryGetPayload<ApiContracts.Website>(context);
        if (!this.isValidWebsiteObject(payload) || this.hasInvalidId(payload) || this.hasDisallowedProperties(payload)) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest);

            return false;
        }

        return true;
    }

    private hasInvalidId(website: ApiContracts.Website): boolean {
        return website.id !== undefined && !this.guidGenerator.isValidV6Guid(website.id);
    }

    private hasDisallowedProperties(website: ApiContracts.Website): boolean {
        // Existing page documents will not be updated through this endpoint
        return website.pages !== undefined;
    }
}
