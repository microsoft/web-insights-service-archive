// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ContextAwareLogger } from 'logger';
import { ApiController, HttpResponse, WebApiErrorCodes, WebsiteProvider, WebsiteScanProvider } from 'service-library';
import { createWebsiteScanApiResponse, WebsiteScanDocumentResponseConverter } from '../converters/website-scan-document-response-converter';
import { SubmitWebsiteScanRequestValidator } from '../request-validators/submit-website-scan-request-validator';

@injectable()
export class SubmitWebsiteScanController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-submit-website-scan';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(SubmitWebsiteScanRequestValidator) requestValidator: SubmitWebsiteScanRequestValidator,
        @inject(WebsiteProvider) private readonly websiteProvider: WebsiteProvider,
        @inject(WebsiteScanProvider) private readonly websiteScanProvider: WebsiteScanProvider,
        private readonly convertWebsiteScanDocumentToResponse: WebsiteScanDocumentResponseConverter = createWebsiteScanApiResponse,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        this.logger.setCommonProperties({ source: 'submitWebsiteScanRESTApi' });

        const websiteScanRequest = this.tryGetPayload<ApiContracts.WebsiteScanRequest>();
        this.logger.setCommonProperties({ websiteId: websiteScanRequest.websiteId });

        if (!(await this.websiteExists(websiteScanRequest.websiteId))) {
            this.logger.logError('Unable to create websiteScan because website does not exist');
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);

            return;
        }

        const websiteScanDocument = await this.websiteScanProvider.createScanDocumentForWebsite(
            websiteScanRequest.websiteId,
            websiteScanRequest.scanType,
            websiteScanRequest.scanFrequency, // add default to serviceConfig for each scan type
            websiteScanRequest.priority,
        );

        const responseBody = await this.convertWebsiteScanDocumentToResponse(websiteScanDocument);

        this.context.res = {
            status: 201,
            body: responseBody,
        };

        this.logger.logInfo('Website metadata successfully posted to storage.');
    }

    private async websiteExists(websiteId: string): Promise<boolean> {
        try {
            await this.websiteProvider.readWebsite(websiteId);
        } catch (e) {
            return false;
        }

        return true;
    }
}
