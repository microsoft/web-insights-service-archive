// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as StorageDocuments from 'storage-documents';
import * as ApiContracts from 'api-contracts';

export type PageDocumentResponseConverter = typeof createPageApiResponse;

export const createPageApiResponse = (pageDocument: StorageDocuments.Page): ApiContracts.Page => {
    return {
        id: pageDocument.id,
        url: pageDocument.url,
        lastScanTimestamp: pageDocument.lastScanTimestamp,
    };
};
