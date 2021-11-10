// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { HttpResponse, WebApiErrorCodes, ApiController, PageProvider } from 'service-library';
import * as StorageDocuments from 'storage-documents';
import * as ApiContracts from 'api-contracts';
import { authorize } from 'azure-services';
import { createPageApiResponse, PageDocumentResponseConverter } from '../converters/page-document-response-converter';
import { PostPageRequestValidator } from '../request-validators/post-page-request-validator';

@authorize('aclApiWriteAll')
@injectable()
export class PostPageController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-post-page';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(PostPageRequestValidator) requestValidator: PostPageRequestValidator,
        @inject(PageProvider) private readonly pageProvider: PageProvider,
        private readonly convertPageDocumentToResponse: PageDocumentResponseConverter = createPageApiResponse,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        const { pageId, ...pageUpdateData } = this.tryGetPayload<ApiContracts.PageUpdate>();

        this.logger.setCommonProperties({ source: 'postPageRESTApi', websiteId: pageId });

        let pageDoc: StorageDocuments.Page;
        try {
            pageDoc = await this.pageProvider.readPage(pageId);
        } catch (e) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
            this.logger.logError('Error reading page document', { error: JSON.stringify(e) });

            return;
        }

        pageDoc = await this.pageProvider.updatePage({ id: pageId, ...pageUpdateData });

        this.context.res = {
            status: 200,
            body: this.convertPageDocumentToResponse(pageDoc),
        };
        this.logger.logInfo('Page metadata successfully updated in storage.');
    }
}
