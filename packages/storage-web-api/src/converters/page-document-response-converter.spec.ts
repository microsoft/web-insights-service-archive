// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { createPageApiObject, createPageApiResponse } from './page-document-response-converter';

describe('PageDocumentResponseConverter', () => {
    const pageDoc: StorageDocuments.Page = {
        id: 'page id',
        url: 'page url',
        websiteId: 'website id',
        lastScanTimestamp: 1234,
        disabledScans: ['a11y'],
        itemType: StorageDocuments.itemTypes.page,
        partitionKey: 'partition key',
    };

    describe(createPageApiObject, () => {
        it('returns expected object', () => {
            const expectedResponse: ApiContracts.Page = {
                id: pageDoc.id,
                url: pageDoc.url,
                lastScanTimestamp: pageDoc.lastScanTimestamp,
                disabledScans: ['a11y'],
            };

            expect(createPageApiObject(pageDoc)).toEqual(expectedResponse);
        });
    });

    describe(createPageApiResponse, () => {
        it('returns expected object', () => {
            const expectedResponse: ApiContracts.Page = {
                id: pageDoc.id,
                url: pageDoc.url,
                lastScanTimestamp: pageDoc.lastScanTimestamp,
                disabledScans: ['a11y'],
                websiteId: pageDoc.websiteId,
            };

            expect(createPageApiResponse(pageDoc)).toEqual(expectedResponse);
        });
    });
});
