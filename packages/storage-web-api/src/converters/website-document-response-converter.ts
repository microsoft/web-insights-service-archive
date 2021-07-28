// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosQueryResultsIterable } from 'service-library';
import * as StorageDocuments from 'storage-documents';
import * as ApiContracts from 'api-contracts';
import { createPageApiObject, PageDocumentResponseConverter } from './page-document-response-converter';

export type WebsiteDocumentResponseConverter = typeof createWebsiteApiResponse;

export const createWebsiteApiResponse = async (
    websiteDocument: StorageDocuments.Website,
    pagesIterable: CosmosQueryResultsIterable<StorageDocuments.Page>,
    createPageObject: PageDocumentResponseConverter = createPageApiObject,
): Promise<ApiContracts.Website> => {
    const response: ApiContracts.Website = {
        id: websiteDocument.id,
        name: websiteDocument.name,
        baseUrl: websiteDocument.baseUrl,
        priority: websiteDocument.priority,
        discoveryPatterns: websiteDocument.discoveryPatterns,
        knownPages: websiteDocument.knownPages,
        scanners: websiteDocument.scanners,
        domainId: websiteDocument.domainId,
        owners: websiteDocument.owners,
        orgCvp: websiteDocument.orgCvp,
        usingUhf: websiteDocument.usingUhf,
        compliant: websiteDocument.compliant,
        enableCrawler: websiteDocument.enableCrawler,
        deleted: websiteDocument.deleted,
        divisionId: websiteDocument.divisionId,
        stateId: websiteDocument.stateId,
        noBanner: websiteDocument.noBanner,
        noBannerReasonId: websiteDocument.noBannerReasonId,
        serviceTreeId: websiteDocument.serviceTreeId,
        notes: websiteDocument.notes,
        alias: websiteDocument.alias,
        organizationId: websiteDocument.organizationId,
        celaAccessibilityContacts: websiteDocument.celaAccessibilityContacts,
        privacyEGRCExceptionId: websiteDocument.privacyEGRCExceptionId,
        A11yEGRCExceptionId: websiteDocument.A11yEGRCExceptionId,
        optOutSecurityReason: websiteDocument.optOutSecurityReason,
        isCustomBanner: websiteDocument.isCustomBanner,
        isMicrosoftOwned: websiteDocument.isMicrosoftOwned,
        requireAuthentication: websiteDocument.requireAuthentication,
        manageCookieXpath: websiteDocument.manageCookieXpath,
        isCookieManagable: websiteDocument.isCookieManagable,
        pages: [],
    };

    for await (const page of pagesIterable) {
        if (page !== undefined) {
            response.pages.push(createPageObject(page));
        }
    }

    return response;
};
