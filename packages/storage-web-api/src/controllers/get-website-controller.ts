// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ContextAwareLogger } from 'logger';
import { HttpResponse, WebApiErrorCodes, ApiController, WebsiteProvider, PageProvider } from 'service-library';
import { client } from 'azure-services';
import { createWebsiteApiResponse, WebsiteDocumentResponseConverter } from '../converters/website-document-response-converter';
import { GetWebsiteRequestValidator } from '../request-validators/get-website-request-validator';

@injectable()
export class GetWebsiteController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-get-website';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(GetWebsiteRequestValidator) requestValidator: GetWebsiteRequestValidator,
        @inject(WebsiteProvider) private readonly websiteProvider: WebsiteProvider,
        @inject(PageProvider) private readonly pageProvider: PageProvider,
        private readonly convertWebsiteDocumentToResponse: WebsiteDocumentResponseConverter = createWebsiteApiResponse,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        const websiteId = <string>this.context.bindingData.websiteId;
        this.logger.setCommonProperties({ source: 'getWebsiteRESTApi', websiteId });

        if (isEmpty(websiteId)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);
            this.logger.logError('The client request website id is malformed.');

            return;
        }

        const websiteResponse = await this.websiteProvider.readWebsite(websiteId, false);
        if (websiteResponse.statusCode === 404) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
            this.logger.logError('Website document not found');

            return;
        }
        if (!client.isSuccessStatusCode(websiteResponse)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);
            this.logger.logError('Unable to read website');

            return;
        }

        const websitePagesIterable = this.pageProvider.getPagesForWebsite(websiteId);
        const websiteResponseBody = await this.convertWebsiteDocumentToResponse(websiteResponse.item, websitePagesIterable);

        this.context.res = {
            status: 200,
            body: websiteResponseBody,
        };
        this.logger.logInfo('Website metadata successfully fetched from a storage.');
    }
}
