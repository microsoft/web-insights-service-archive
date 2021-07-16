// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ContextAwareLogger } from 'logger';
import { HttpResponse, WebApiErrorCodes, ApiController, WebsiteProvider, PageProvider } from 'service-library';
import * as StorageDocuments from 'storage-documents';
import { createPageApiResponse, PageDocumentResponseConverter } from '../converters/page-document-response-converter';
import { createWebsiteApiResponse, WebsiteDocumentResponseConverter } from '../converters/website-document-response-converter';

@injectable()
export class PostWebsiteController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-get-website';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(WebsiteProvider) private readonly websiteProvider: WebsiteProvider,
        @inject(PageProvider) private readonly pageProvider: PageProvider,
        private readonly isValidWebsite: typeof ApiContracts.isValidWebsite = ApiContracts.isValidWebsite,
        private readonly convertWebsiteDocumentToResponse: WebsiteDocumentResponseConverter = createWebsiteApiResponse,
        private readonly convertPageDocumentToResponse: PageDocumentResponseConverter = createPageApiResponse,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        this.logger.setCommonProperties({ source: 'postWebsiteRESTApi' });

        const websiteRequest = this.tryGetPayload<ApiContracts.Website>();

        const websiteDoc = await this.createOrUpdateWebsite(websiteRequest);

        const pagesIterator = this.pageProvider.getPagesForWebsite(websiteDoc.id);
        let websiteResponse = await this.convertWebsiteDocumentToResponse(websiteDoc, pagesIterator);

        websiteResponse = await this.createNewPages(websiteResponse);

        this.context.res = {
            status: 200,
            body: websiteResponse,
        };
        this.logger.logInfo('Website metadata successfully fetched from a storage.');
    }

    protected validateRequest(): boolean {
        if (!super.validateRequest()) {
            return false;
        }

        const hasInvalidId = (website: ApiContracts.Website) => website.id !== undefined && !this.guidGenerator.isValidV6Guid(website.id);
        // Existing page documents will not be updated through this endpoint
        const hasInvalidProperties = (website: ApiContracts.Website) => website.pages !== undefined;

        const payload = this.tryGetPayload<ApiContracts.Website>();
        if (!this.isValidWebsite(payload) || hasInvalidId(payload) || hasInvalidProperties(payload)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest);

            return false;
        }

        return true;
    }

    private async createOrUpdateWebsite(websiteRequest: ApiContracts.Website): Promise<StorageDocuments.Website> {
        let websiteDoc: StorageDocuments.Website;
        if (websiteRequest.id === undefined) {
            websiteDoc = await this.websiteProvider.createWebsite(websiteRequest);
            this.logger.setCommonProperties({ websiteId: websiteDoc.id });
            this.logger.logInfo('Successfully created new website document');
        } else {
            this.logger.setCommonProperties({ websiteId: websiteRequest.id });
            websiteDoc = await this.websiteProvider.updateWebsite(websiteRequest);
            this.logger.logInfo('Successfully updated website document');
        }

        return websiteDoc;
    }

    private async createNewPages(websiteResponse: ApiContracts.Website): Promise<ApiContracts.Website> {
        const existingPageUrls = websiteResponse.pages.map((page) => page.url);
        const newPageUrls = _.difference(websiteResponse.knownPages, existingPageUrls);
        await Promise.all(
            newPageUrls.map(async (url) => {
                const pageDoc = await this.pageProvider.createPageForWebsite(url, websiteResponse.id);
                websiteResponse.pages.push(this.convertPageDocumentToResponse(pageDoc));

                this.logger.logInfo('Created new page document', { pageUrl: url, pageId: pageDoc.id });
            }),
        );

        return websiteResponse;
    }
}
