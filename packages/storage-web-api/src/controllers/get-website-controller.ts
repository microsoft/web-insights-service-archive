// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ContextAwareLogger } from 'logger';
import { HttpResponse, WebApiErrorCodes, ApiController } from 'service-library';

@injectable()
export class GetWebsiteController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-get-website';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        const websiteId = <string>this.context.bindingData.websiteId;
        this.logger.setCommonProperties({ source: 'getWebsiteRESTApi', websiteId });

        if (isEmpty(websiteId)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);
            this.logger.logError('The client request website id is malformed.');

            return;
        }

        const website = {
            id: websiteId,
            baseUrl: 'https://accessibilityinsights.io/',
        };
        this.context.res = {
            status: 200,
            body: website,
        };
        this.logger.logInfo('Website metadata successfully fetched from a storage.');
    }
}
