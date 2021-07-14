// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { mockCosmosQueryResults } from '../test-utilities/cosmos-query-results-iterable-mock';
import { createWebsiteApiResponse } from './website-document-response-converter';

describe(createWebsiteApiResponse, () => {
    const websiteId = 'website id';
    const websiteData: StorageDocuments.DocumentDataOnly<StorageDocuments.Website> = {
        name: 'website name',
        baseUrl: 'base url',
        priority: 10,
        discoveryPatterns: ['discovery pattern'],
        knownPages: ['known page'],
        scanners: ['a11y'],
        domainId: 'domain id',
        owners: ['owner'],
        orgCvp: 'org cvp',
        usingUhf: true,
        compliant: false,
        enableCrawler: true,
        deleted: false,
        divisionId: 1,
        stateId: 2,
        noBanner: true,
        noBannerReasonId: 3,
        serviceTreeId: 'service tree id',
        notes: 'notes',
        alias: 'alias',
        organizationId: 4,
        celaAccessibilityContacts: ['accessibility contact'],
        privacyEGRCExceptionId: 'privacy exception id',
        A11yEGRCExceptionId: 'a11y exception id',
        optOutSecurityReason: 'security opt out reason',
        isCustomBanner: false,
        isMicrosoftOwned: true,
        requireAuthentication: false,
        manageCookieXpath: 'xpath',
        isCookieManagable: true,
    };
    const websiteDocument: StorageDocuments.Website = {
        id: websiteId,
        itemType: StorageDocuments.itemTypes.website,
        partitionKey: 'partition key',
        ...websiteData,
    };
    const pages: ApiContracts.Page[] = [
        {
            id: 'page 1 id',
            url: 'page 1 url',
        },
        {
            id: 'page 2 id',
            url: 'page 2 url',
        },
    ];

    it('creates expected response', async () => {
        const expectedResponse: ApiContracts.Website = {
            ...websiteData,
            id: websiteId,
            pages: pages,
        };
        const pagesIterableMock = mockCosmosQueryResults<StorageDocuments.Page>(
            pages.map((pageData) =>
                Promise.resolve({
                    ...pageData,
                    websiteId,
                    itemType: StorageDocuments.itemTypes.page,
                    partitionKey: 'partition key',
                }),
            ),
        );

        const actualResponse = await createWebsiteApiResponse(websiteDocument, pagesIterableMock.object);

        expect(actualResponse).toEqual(expectedResponse);
    });

    it('Handles undefined pages', async () => {
        const expectedResponse: ApiContracts.Website = {
            ...websiteData,
            id: websiteId,
            pages: [],
        };
        const pagesIterableMock = mockCosmosQueryResults<StorageDocuments.Page>(pages.map((pageData) => Promise.resolve(undefined)));

        const actualResponse = await createWebsiteApiResponse(websiteDocument, pagesIterableMock.object);

        expect(actualResponse).toEqual(expectedResponse);
    });
});
