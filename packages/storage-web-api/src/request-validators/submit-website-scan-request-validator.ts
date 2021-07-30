// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { Context } from '@azure/functions';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { GuidGenerator } from 'common';
import { ApiRequestValidator, HttpResponse, WebApiErrorCodes } from 'service-library';
import * as cronParser from 'cron-parser';

@injectable()
export class SubmitWebsiteScanRequestValidator extends ApiRequestValidator {
    protected readonly apiVersions = ['1.0'];

    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        // prettier-ignore
        private readonly isValidWebsiteScanRequest: ApiContracts.ApiObjectValidator<ApiContracts.WebsiteScanRequest>
            = ApiContracts.isValidWebsiteScanRequestObject,
        private readonly cronParserObj: typeof cronParser = cronParser,
    ) {
        super();
    }

    public validateRequest(context: Context): boolean {
        if (!super.validateRequest(context)) {
            return false;
        }

        const payload = this.tryGetPayload<ApiContracts.WebsiteScanRequest>(context);
        if (
            !this.isValidWebsiteScanRequest(payload) ||
            !this.guidGenerator.isValidV6Guid(payload.websiteId) ||
            this.hasInvalidFrequencyExpression(payload)
        ) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest);

            return false;
        }

        return true;
    }

    private hasInvalidFrequencyExpression(websiteScanRequest: ApiContracts.WebsiteScanRequest): boolean {
        if (websiteScanRequest.scanFrequency === undefined) {
            return false;
        }

        try {
            this.cronParserObj.parseExpression(websiteScanRequest.scanFrequency);
        } catch (e) {
            return true;
        }

        return false;
    }
}
