// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as StorageDocuments from 'storage-documents';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ApiController, HttpResponse, PageProvider, PageScanProvider, WebApiErrorCodes, WebsiteScanProvider } from 'service-library';
import { client } from 'azure-services';
import { GetWebsiteRequestValidator } from '../request-validators/get-website-request-validator';
import { GetWebsiteScanRequestValidator, latestScanTarget } from '../request-validators/get-website-scan-request-validator';
import { createWebsiteScanApiResponse, WebsiteScanDocumentResponseConverter } from '../converters/website-scan-document-response-converter';

@injectable()
export class GetWebsiteScanController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-get-website-scan';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(GetWebsiteRequestValidator) requestValidator: GetWebsiteScanRequestValidator,
        @inject(WebsiteScanProvider) private readonly websiteScanProvider: WebsiteScanProvider,
        @inject(PageScanProvider) private readonly pageScanProvider: PageScanProvider,
        @inject(PageProvider) private readonly pageProvider: PageProvider, // TODO: make converter an object and inject this into that
        private readonly convertWebsiteScanDocumentToResponse: WebsiteScanDocumentResponseConverter = createWebsiteScanApiResponse,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        const websiteId = this.context.bindingData.websiteId;
        const scanTarget = this.context.bindingData.scanTarget;
        const scanType = this.context.bindingData.scanType as StorageDocuments.ScanType;

        this.logger.setCommonProperties({ source: 'getWebsiteRESTApi', websiteId });

        let websiteScanDocument: StorageDocuments.WebsiteScan | null;
        if (scanTarget === latestScanTarget) {
            websiteScanDocument = await this.getLatestWebsiteScan(websiteId, scanType);
        } else {
            websiteScanDocument = await this.getScanWithId(scanTarget);
        }

        if (websiteScanDocument === null) {
            return;
        }

        this.logger.setCommonProperties({ websiteScanId: websiteScanDocument.id });

        const pageScanIterable = this.pageScanProvider.getAllPageScansForWebsiteScan(websiteScanDocument.id);

        const getPageForScan = (pageScan: StorageDocuments.PageScan) => this.pageProvider.readPage(pageScan.pageId);
        const websiteScanResponseObj = await this.convertWebsiteScanDocumentToResponse(
            websiteScanDocument,
            pageScanIterable,
            getPageForScan,
        );

        this.context.res = {
            statusCode: 200,
            body: websiteScanResponseObj,
        };
    }

    private async getScanWithId(scanId: string): Promise<StorageDocuments.WebsiteScan | null> {
        const websiteDocumentResponse = await this.websiteScanProvider.readWebsiteScan(scanId);
        if (!client.isSuccessStatusCode(websiteDocumentResponse)) {
            if (websiteDocumentResponse.statusCode === 404) {
                this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
                this.logger.logError('Website scan document not found');
            } else {
                this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);
                this.logger.logError('Error reading websiteScan document', { statusCode: `${websiteDocumentResponse.statusCode}` });
            }

            return null;
        } else {
            return websiteDocumentResponse.item;
        }
    }

    private async getLatestWebsiteScan(
        websiteId: string,
        scanType: StorageDocuments.ScanType,
    ): Promise<StorageDocuments.WebsiteScan | null> {
        return null; //TODO: implement
    }
}
