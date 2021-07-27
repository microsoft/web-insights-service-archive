// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ContextAwareLogger } from 'logger';
import { ApiController, WebsiteProvider, PageProvider } from 'service-library';
import * as StorageDocuments from 'storage-documents';
import { createPageApiResponse, PageDocumentResponseConverter } from '../converters/page-document-response-converter';
import { createWebsiteApiResponse, WebsiteDocumentResponseConverter } from '../converters/website-document-response-converter';
import { PostWebsiteRequestValidator } from '../request-validators/post-website-request-validator';

type WebsiteUpdateResponse = {
    website: ApiContracts.Website | StorageDocuments.Website;
    created: boolean;
};

@injectable()
export class PostWebsiteController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-post-website';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(PostWebsiteRequestValidator) requestValidator: PostWebsiteRequestValidator,
        @inject(WebsiteProvider) private readonly websiteProvider: WebsiteProvider,
        @inject(PageProvider) private readonly pageProvider: PageProvider,
        private readonly convertWebsiteDocumentToResponse: WebsiteDocumentResponseConverter = createWebsiteApiResponse,
        private readonly convertPageDocumentToResponse: PageDocumentResponseConverter = createPageApiResponse,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        this.logger.setCommonProperties({ source: 'postWebsiteRESTApi' });

        const websiteRequest = this.tryGetPayload<ApiContracts.Website>();

        const { website: websiteDocument, created: websiteCreated } = await this.createOrUpdateWebsite(websiteRequest);

        const pagesIterator = this.pageProvider.getPagesForWebsite(websiteDocument.id);
        let websiteResponse = await this.convertWebsiteDocumentToResponse(websiteDocument as StorageDocuments.Website, pagesIterator);
        let pagesCreated: boolean;

        // eslint-disable-next-line prefer-const
        ({ website: websiteResponse, created: pagesCreated } = await this.createNewPages(websiteResponse));

        this.context.res = {
            status: websiteCreated || pagesCreated ? 201 : 200,
            body: websiteResponse,
        };
        this.logger.logInfo('Website metadata successfully posted to storage.');
    }

    private async createOrUpdateWebsite(websiteRequest: ApiContracts.Website): Promise<WebsiteUpdateResponse> {
        let websiteDoc: StorageDocuments.Website;
        let created = false;
        if (websiteRequest.id === undefined) {
            websiteDoc = await this.websiteProvider.createWebsite(websiteRequest);
            this.logger.setCommonProperties({ websiteId: websiteDoc.id });
            this.logger.logInfo('Successfully created new website document');
            created = true;
        } else {
            this.logger.setCommonProperties({ websiteId: websiteRequest.id });
            websiteDoc = await this.websiteProvider.updateWebsite(websiteRequest);
            this.logger.logInfo('Successfully updated website document');
        }

        return {
            website: websiteDoc,
            created: created,
        };
    }

    private async createNewPages(websiteResponse: ApiContracts.Website): Promise<WebsiteUpdateResponse> {
        const existingPageUrls = websiteResponse.pages.map((page) => page.url);
        const newPageUrls = _.difference(websiteResponse.knownPages, existingPageUrls);
        await Promise.all(
            newPageUrls.map(async (url) => {
                const pageDoc = await this.pageProvider.createPageForWebsite(url, websiteResponse.id);
                websiteResponse.pages.push(this.convertPageDocumentToResponse(pageDoc));

                this.logger.logInfo('Created new page document', { pageUrl: url, pageId: pageDoc.id });
            }),
        );

        return {
            website: websiteResponse,
            created: newPageUrls.length > 0,
        };
    }
}
