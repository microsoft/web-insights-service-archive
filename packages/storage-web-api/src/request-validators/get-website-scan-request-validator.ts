// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { Context } from '@azure/functions';
import { inject, injectable } from 'inversify';
import { ApiRequestValidator, HttpResponse, WebApiErrorCodes } from 'service-library';
import _ from 'lodash';
import { GuidGenerator } from 'common';

export const latestScanTag = 'latest';

@injectable()
export class GetWebsiteScanRequestValidator extends ApiRequestValidator {
    protected readonly apiVersions = ['1.0'];

    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        private readonly isValidScanType: ApiContracts.ApiObjectValidator<StorageDocuments.ScanType> = ApiContracts.isValidScanType,
    ) {
        super();
    }

    public async validateRequest(context: Context): Promise<boolean> {
        if (!(await super.validateRequest(context))) {
            return false;
        }

        const websiteId = <string>context.bindingData.websiteId;
        const scanIdOrLatest = <string>context.bindingData.scanIdOrLatest;
        const scanType = <StorageDocuments.ScanType>context.bindingData.scanType;

        if (this.isInvalidWebsiteId(websiteId) || this.isInvalidScanTarget(scanIdOrLatest)) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);

            return false;
        }

        if (!this.isValidScanType(scanType)) {
            context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidScanType);

            return false;
        }

        return true;
    }

    private isInvalidWebsiteId(websiteId: string): boolean {
        return _.isEmpty(websiteId) || !this.guidGenerator.isValidV6Guid(websiteId);
    }

    private isInvalidScanTarget(scanIdOrLatest: string): boolean {
        return _.isEmpty(scanIdOrLatest) || (!this.guidGenerator.isValidV6Guid(scanIdOrLatest) && scanIdOrLatest !== latestScanTag);
    }
}
