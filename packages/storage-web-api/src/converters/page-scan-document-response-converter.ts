// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as StorageDocuments from 'storage-documents';
import * as ApiContracts from 'api-contracts';
import { createPageApiObject } from './page-document-response-converter';

export type PageScanDocumentResponseConverter = typeof createPageScanApiObject;

export const createPageScanApiObject = (
    pageScanDocument: StorageDocuments.PageScan,
    pageDocument: StorageDocuments.Page,
    createPageObject = createPageApiObject,
): ApiContracts.PageScan => {
    return {
        id: pageScanDocument.id,
        page: createPageObject(pageDocument),
        priority: pageScanDocument.priority,
        reports: pageScanDocument.reports,
        result: pageScanDocument.result,
        run: pageScanDocument.run,
    };
};
