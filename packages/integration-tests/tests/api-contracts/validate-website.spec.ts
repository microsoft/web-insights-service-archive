// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

/* eslint-disable import/no-internal-modules */

import { isValidWebsite, Website, websiteWithAllProperties, websiteWithRequiredProperties } from 'api-contracts';

describe(isValidWebsite, () => {
    it('Returns true for website with all required properties', () => {
        expect(isValidWebsite(websiteWithRequiredProperties)).toBe(true);
    });

    it('Returns true for website with all properties', () => {
        expect(isValidWebsite(websiteWithAllProperties)).toBe(true);
    });

    it('Returns false for website with unknown properties', () => {
        const obj = {
            ...websiteWithRequiredProperties,
            unknownProperty: 'test value',
        };
        expect(isValidWebsite(obj)).toBe(false);
    });

    it('Returns false for website missing required properties', () => {
        const { baseUrl, ...obj } = websiteWithRequiredProperties;

        expect(isValidWebsite(obj as Website)).toBe(false);
    });

    it('Returns false if website has incorrect format for pages', () => {
        const obj = {
            ...websiteWithRequiredProperties,
            pages: [
                {
                    unknownProperty: 'value',
                },
            ],
        };

        expect(isValidWebsite(obj as unknown as Website)).toBe(false);
    });
});
