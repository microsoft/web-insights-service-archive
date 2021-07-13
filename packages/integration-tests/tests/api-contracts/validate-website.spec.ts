// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

/* eslint-disable import/no-internal-modules */

import { isValidWebsite, Website } from 'api-contracts';

describe(isValidWebsite, () => {
    const websiteRequiredProperties: Website = {
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

    const websiteAllProperties: Website = {
        ...websiteRequiredProperties,
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

    it('Returns true for website with all required properties', () => {
        expect(isValidWebsite(websiteAllProperties)).toBe(true);
    });

    it('Returns true for website with all properties', () => {
        expect(isValidWebsite(websiteAllProperties)).toBe(true);
    });

    it('Returns false for website with unknown properties', () => {
        const obj = {
            ...websiteRequiredProperties,
            unknownProperty: 'test value',
        };
        expect(isValidWebsite(obj)).toBe(false);
    });

    it('Returns false for website missing required properties', () => {
        const { baseUrl, ...obj } = websiteRequiredProperties;

        expect(isValidWebsite(obj as Website)).toBe(false);
    });

    it('Returns false if website has incorrect format for pages', () => {
        const obj = {
            ...websiteRequiredProperties,
            pages: [
                {
                    unknownProperty: 'value',
                },
            ],
        };

        expect(isValidWebsite(obj as unknown as Website)).toBe(false);
    });
});
