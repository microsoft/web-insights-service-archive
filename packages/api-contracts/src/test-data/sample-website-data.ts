// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Website } from '../types/website';

export const websiteWithRequiredProperties: Website = {
    name: 'website name',
    baseUrl: 'base url',
    priority: 10,
    discoveryPatterns: ['discovery pattern'],
    knownPages: ['known page'],
    scanners: ['a11y'],
    domainId: 'domain id',
    compliant: false,
    enableCrawler: true,
    deleted: false,
    noBanner: true,
    serviceTreeId: 'service tree id',
    isCustomBanner: false,
    isMicrosoftOwned: true,
    isCookieManagable: true,
};

export const websiteWithAllProperties: Website = {
    ...websiteWithRequiredProperties,
    id: 'website id',
    owners: ['owner'],
    orgCvp: 'org cvp',
    usingUhf: true,
    divisionId: 1,
    stateId: 2,
    noBannerReasonId: 3,
    notes: 'notes',
    alias: 'alias',
    organizationId: 4,
    celaAccessibilityContacts: ['accessibility contact'],
    privacyEGRCExceptionId: 'privacy exception id',
    A11yEGRCExceptionId: 'a11y exception id',
    optOutSecurityReason: 'security opt out reason',
    requireAuthentication: false,
    manageCookieXpath: 'xpath',
    pages: [
        {
            id: 'page id',
            url: 'page url',
        },
    ],
};
