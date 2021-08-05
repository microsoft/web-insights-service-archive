// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import _ from 'lodash';
import { IMock, Mock } from 'typemoq';
import { CosmosQueryResultsIterable, PageProvider } from 'service-library';
import { mockCosmosQueryResults } from '../test-utilities/cosmos-query-results-iterable-mock';
import { createWebsiteScanApiResponse } from './website-scan-document-response-converter';
import { PageScanDocumentResponseConverter } from './page-scan-document-response-converter';

describe(createWebsiteScanApiResponse, () => {
    let websiteScanDocument: StorageDocuments.WebsiteScan;
    let pageProviderMock: IMock<PageProvider>;
    let createPageScanObjectMock: IMock<PageScanDocumentResponseConverter>;

    beforeEach(() => {
        websiteScanDocument = {
            ..._.cloneDeep(ApiContracts.newWebsiteScan),
            itemType: StorageDocuments.itemTypes.websiteScan,
            partitionKey: 'partition key',
        };

        pageProviderMock = Mock.ofType<PageProvider>();
        createPageScanObjectMock = Mock.ofType<PageScanDocumentResponseConverter>();
    });

    it('converts website scan when no page scans are provided', async () => {
        expect(await createWebsiteScanApiResponse(websiteScanDocument)).toEqual(ApiContracts.newWebsiteScan);
    });

    describe('with pageScans provided', () => {
        const pageScanObjects: ApiContracts.PageScan[] = [
            _.cloneDeep(ApiContracts.pendingPageScan),
            _.cloneDeep(ApiContracts.passedPageScan),
        ];
        const expectedResponse: ApiContracts.WebsiteScan = {
            ...ApiContracts.newWebsiteScan,
            pageScans: pageScanObjects,
        };

        it('returns expected response', async () => {
            const pageScansIterable = setupPageScans();

            expect(
                await createWebsiteScanApiResponse(
                    websiteScanDocument,
                    pageProviderMock.object,
                    pageScansIterable.object,
                    createPageScanObjectMock.object,
                ),
            ).toEqual(expectedResponse);
        });

        it('handles undefined pageScans', async () => {
            const pageScansIterable = setupPageScans(true);

            expect(
                await createWebsiteScanApiResponse(
                    websiteScanDocument,
                    pageProviderMock.object,
                    pageScansIterable.object,
                    createPageScanObjectMock.object,
                ),
            ).toEqual(expectedResponse);
        });

        function setupPageScans(withUndefinedDocument: boolean = false): IMock<CosmosQueryResultsIterable<StorageDocuments.PageScan>> {
            const pageScanDocuments: StorageDocuments.PageScan[] = [];
            if (withUndefinedDocument) {
                pageScanDocuments.push(undefined);
            }

            pageScanObjects.forEach((pageScanObject) => {
                const { page, ...pageScanData } = pageScanObject;

                const pageScanDocument = {
                    ...pageScanData,
                    pageId: page.id,
                    partitionKey: 'partition key',
                    itemType: StorageDocuments.itemTypes.pageScan,
                } as StorageDocuments.PageScan;
                pageScanDocuments.push(pageScanDocument);

                const pageDocument = {
                    ...page,
                    partitionKey: 'page partition key',
                    itemType: StorageDocuments.itemTypes.page,
                } as StorageDocuments.Page;

                pageProviderMock.setup((pp) => pp.readPage(page.id)).returns(async () => pageDocument);
                createPageScanObjectMock.setup((c) => c(pageScanDocument, pageDocument)).returns(() => pageScanObject);
            });

            return mockCosmosQueryResults(pageScanDocuments.map((pageScan) => Promise.resolve(pageScan)));
        }
    });
});
