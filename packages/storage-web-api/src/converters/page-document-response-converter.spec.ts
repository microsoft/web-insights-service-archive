// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { createPageApiResponse } from './page-document-response-converter';

describe(createPageApiResponse, () => {
    const pageDoc: StorageDocuments.Page = {
        id: 'page id',
        url: 'page url',
        websiteId: 'website id',
        lastScanTimestamp: 1234,
        itemType: StorageDocuments.itemTypes.page,
        partitionKey: 'partition key',
    };

    it('returns expected object', () => {
        const expectedResponse: ApiContracts.Page = {
            id: pageDoc.id,
            url: pageDoc.url,
            lastScanTimestamp: pageDoc.lastScanTimestamp,
        };

        expect(createPageApiResponse(pageDoc)).toEqual(expectedResponse);
    });
});
