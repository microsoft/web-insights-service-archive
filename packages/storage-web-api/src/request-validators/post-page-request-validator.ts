// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ApiRequestValidator, HttpResponse, WebApiErrorCodes } from 'service-library';
import * as ApiContracts from 'api-contracts';
import { GuidGenerator } from 'common';
import { Context } from '@azure/functions';

@injectable()
export class PostPageRequestValidator extends ApiRequestValidator {
    protected readonly apiVersions = ['1.0'];

    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        private readonly isValidPageUpdateObject: typeof ApiContracts.isValidPageUpdateObject = ApiContracts.isValidPageUpdateObject,
    ) {
        super();
    }

    public async validateRequest(context: Context): Promise<boolean> {
        if (!(await super.validateRequest(context))) {
            return false;
        }

        const payload = this.tryGetPayload<ApiContracts.PageUpdate>(context);
        if (!this.isValidPageUpdateObject(payload)) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest);

            return false;
        }

        if (!this.hasValidId(payload)) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);

            return false;
        }

        return true;
    }

    private hasValidId(pageUpdate: ApiContracts.PageUpdate): boolean {
        return pageUpdate.pageId !== undefined && this.guidGenerator.isValidV6Guid(pageUpdate.pageId);
    }
}
