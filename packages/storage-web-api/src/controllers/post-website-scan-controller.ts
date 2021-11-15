// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { RestApiConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ContextAwareLogger } from 'logger';
import { ApiController, HttpResponse, WebApiErrorCodes, WebsiteProvider, WebsiteScanProvider } from 'service-library';
import { client, authorize } from 'azure-services';
import { createWebsiteScanApiResponse, WebsiteScanDocumentResponseConverter } from '../converters/website-scan-document-response-converter';
import { PostWebsiteScanRequestValidator } from '../request-validators/post-website-scan-request-validator';

const defaultFrequencyKeys: { [key in StorageDocuments.ScanType]: keyof RestApiConfig } = {
    a11y: 'defaultA11yScanFrequency',
    privacy: undefined,
    security: undefined,
};

@authorize('aclApiWriteAll')
@injectable()
export class PostWebsiteScanController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-post-website-scan';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(PostWebsiteScanRequestValidator) requestValidator: PostWebsiteScanRequestValidator,
        @inject(WebsiteProvider) private readonly websiteProvider: WebsiteProvider,
        @inject(WebsiteScanProvider) private readonly websiteScanProvider: WebsiteScanProvider,
        private readonly convertWebsiteScanDocumentToResponse: WebsiteScanDocumentResponseConverter = createWebsiteScanApiResponse,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        this.logger.setCommonProperties({ source: 'postWebsiteScanRESTApi' });

        const websiteScanRequest = this.tryGetPayload<ApiContracts.WebsiteScanRequest>();
        this.logger.setCommonProperties({ websiteId: websiteScanRequest.websiteId });

        const website = await this.tryReadWebsite(websiteScanRequest.websiteId);
        if (website === null) {
            return;
        }

        const websiteScanDocument = await this.websiteScanProvider.createScanDocumentForWebsite(
            websiteScanRequest.websiteId,
            websiteScanRequest.scanType,
            await this.getScanFrequency(websiteScanRequest),
            websiteScanRequest.priority ?? website.priority,
        );
        this.logger.logInfo('Successfully created websiteScanDocument', { websiteScanId: websiteScanDocument.id });

        const responseBody = await this.convertWebsiteScanDocumentToResponse(websiteScanDocument);

        this.context.res = {
            status: 201,
            body: responseBody,
        };

        this.logger.logInfo('Website metadata successfully posted to storage.');
    }

    private async tryReadWebsite(websiteId: string): Promise<StorageDocuments.Website | null> {
        const websiteResponse = await this.websiteProvider.readWebsite(websiteId, false);
        if (websiteResponse.statusCode === 404) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
            this.logger.logError('Website document not found');

            return null;
        }
        if (!client.isSuccessStatusCode(websiteResponse)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);
            this.logger.logError('Unable to read website document');

            return null;
        }

        return websiteResponse.item;
    }

    private async getScanFrequency(websiteScanRequest: ApiContracts.WebsiteScanRequest): Promise<string> {
        if (websiteScanRequest.scanFrequency !== undefined) {
            return websiteScanRequest.scanFrequency;
        }
        const restApiConfig = await this.getRestApiConfig();
        const configKey = defaultFrequencyKeys[websiteScanRequest.scanType];

        if (configKey === undefined) {
            const errorMessage = `No default scan frequency is implemented for scan type: ${websiteScanRequest.scanType}`;
            this.logger.logError(errorMessage);
            throw new Error(errorMessage);
        }

        return restApiConfig[configKey] as string;
    }
}
