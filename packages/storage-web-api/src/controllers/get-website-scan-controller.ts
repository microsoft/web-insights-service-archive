// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as StorageDocuments from 'storage-documents';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ApiController, HttpResponse, PageProvider, PageScanProvider, WebApiErrorCodes, WebsiteScanProvider } from 'service-library';
import { client, authorize } from 'azure-services';
import { GetWebsiteScanRequestValidator, latestScanTag } from '../request-validators/get-website-scan-request-validator';
import { createWebsiteScanApiResponse, WebsiteScanDocumentResponseConverter } from '../converters/website-scan-document-response-converter';

@authorize('aclApiReadAll')
@injectable()
export class GetWebsiteScanController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'storage-web-api-get-website-scan';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(GetWebsiteScanRequestValidator) requestValidator: GetWebsiteScanRequestValidator,
        @inject(WebsiteScanProvider) private readonly websiteScanProvider: WebsiteScanProvider,
        @inject(PageScanProvider) private readonly pageScanProvider: PageScanProvider,
        @inject(PageProvider) private readonly pageProvider: PageProvider,
        private readonly convertWebsiteScanDocumentToResponse: WebsiteScanDocumentResponseConverter = createWebsiteScanApiResponse,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        const websiteId = this.context.bindingData.websiteId;
        const scanIdOrLatest = this.context.bindingData.scanIdOrLatest;
        const scanType = this.context.bindingData.scanType as StorageDocuments.ScanType;

        this.logger.setCommonProperties({ source: 'getWebsiteScanRESTApi', websiteId, scanType });

        let websiteScanDocument: StorageDocuments.WebsiteScan | null;
        if (scanIdOrLatest === latestScanTag) {
            websiteScanDocument = await this.getLatestWebsiteScan(websiteId, scanType);
        } else {
            websiteScanDocument = await this.getScanWithId(scanIdOrLatest);
        }

        if (websiteScanDocument === null) {
            return;
        }

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
        this.logger.setCommonProperties({ websiteScanId: scanId });
        this.logger.logInfo('Retrieving website scan from storage');

        const websiteDocumentResponse = await this.websiteScanProvider.readWebsiteScan(scanId, false);
        if (!client.isSuccessStatusCode(websiteDocumentResponse)) {
            if (websiteDocumentResponse.statusCode === 404) {
                this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
                this.logger.logError('Website scan document not found');
            } else {
                this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);
                this.logger.logError('Error reading websiteScan document', {
                    statusCode: `${websiteDocumentResponse.statusCode}`,
                });
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
        this.logger.logInfo('Querying storage for latest website scan');

        const websiteDocument = await this.websiteScanProvider.getLatestScanForWebsite(websiteId, scanType);
        if (!websiteDocument) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
            this.logger.logError(`No scan of type ${scanType} was found for this website`);

            return null;
        }

        this.logger.setCommonProperties({ websiteScanId: websiteDocument.id });

        return websiteDocument;
    }
}
