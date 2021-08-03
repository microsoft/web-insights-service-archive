// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosQueryResultsIterable, PageProvider } from 'service-library';
import * as StorageDocuments from 'storage-documents';
import * as ApiContracts from 'api-contracts';
import { createPageScanApiObject, PageScanDocumentResponseConverter } from './page-scan-document-response-converter';

export type WebsiteScanDocumentResponseConverter = typeof createWebsiteScanApiResponse;

export const createWebsiteScanApiResponse = async (
    websiteScanDocument: StorageDocuments.WebsiteScan,
    pageProvider?: PageProvider,
    pageScansIterable?: CosmosQueryResultsIterable<StorageDocuments.PageScan>,
    createPageScanObject: PageScanDocumentResponseConverter = createPageScanApiObject,
): Promise<ApiContracts.WebsiteScan> => {
    const websiteScanApiObject: ApiContracts.WebsiteScan = {
        id: websiteScanDocument.id,
        websiteId: websiteScanDocument.websiteId,
        scanType: websiteScanDocument.scanType,
        scanFrequency: websiteScanDocument.scanFrequency,
        scanStatus: websiteScanDocument.scanStatus,
        priority: websiteScanDocument.priority,
        reports: websiteScanDocument.reports,
    };

    if (pageScansIterable !== undefined && pageProvider !== undefined) {
        websiteScanApiObject.pageScans = [];
        for await (const pageScan of pageScansIterable) {
            if (pageScan !== undefined) {
                const page = await pageProvider.readPage(pageScan.pageId);
                const pageScanObject = createPageScanObject(pageScan, page);
                websiteScanApiObject.pageScans.push(pageScanObject);
            }
        }
    }

    return websiteScanApiObject;
};
