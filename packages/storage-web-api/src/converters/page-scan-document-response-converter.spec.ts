// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { createPageScanApiObject } from './page-scan-document-response-converter';
import { PageDocumentResponseConverter } from './page-document-response-converter';

describe(createPageScanApiObject, () => {
    const pageDoc: StorageDocuments.Page = {
        id: 'page id',
        url: 'page url',
        websiteId: 'website id',
        itemType: StorageDocuments.itemTypes.page,
        partitionKey: 'partition key',
    };
    const pageObject: ApiContracts.Page = {
        id: pageDoc.id,
        url: pageDoc.url,
    };
    const pageScanDoc: StorageDocuments.PageScan = {
        id: 'page scan id',
        pageId: 'page id',
        websiteScanId: 'website scan id',
        priority: 0,
        run: {
            state: 'completed',
            retryCount: 1,
        },
        result: {
            state: 'pass',
        },
        reports: [{ reportId: 'report id', format: 'html', href: 'href' }],
        itemType: StorageDocuments.itemTypes.pageScan,
        partitionKey: 'partition key',
    };

    let createPageObjectMock: IMock<PageDocumentResponseConverter>;

    beforeEach(() => {
        createPageObjectMock = Mock.ofType<PageDocumentResponseConverter>();
        createPageObjectMock.setup((c) => c(pageDoc)).returns(() => pageObject);
    });

    it('returns expected object', () => {
        const expectedResponse: ApiContracts.PageScan = {
            id: pageScanDoc.id,
            page: pageObject,
            run: pageScanDoc.run,
            result: pageScanDoc.result,
            reports: pageScanDoc.reports,
            priority: 0,
        };

        expect(createPageScanApiObject(pageScanDoc, pageDoc, createPageObjectMock.object)).toEqual(expectedResponse);
    });
});
