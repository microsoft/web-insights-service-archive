// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { isValidWebsiteScanRequestObject, WebsiteScanRequest } from 'api-contracts';
import { ScanType } from 'storage-documents';

describe(isValidWebsiteScanRequestObject, () => {
    const websiteId = 'website id';
    const scanType: ScanType = 'a11y';

    it('returns true for website scan request with all required properties', () => {
        const websiteScanRequest: WebsiteScanRequest = {
            websiteId,
            scanType,
        };
        expect(isValidWebsiteScanRequestObject(websiteScanRequest)).toBe(true);
    });

    it('returns true for website scan request with custom scan frequency', () => {
        const websiteScanRequest: WebsiteScanRequest = {
            websiteId,
            scanType,
            scanFrequency: 'scan frequency',
        };
        expect(isValidWebsiteScanRequestObject(websiteScanRequest)).toBe(true);
    });

    it('returns false if website scan request is missing websiteId', () => {
        const websiteScanRequest = { scanType };
        expect(isValidWebsiteScanRequestObject(websiteScanRequest as WebsiteScanRequest)).toBe(false);
    });

    it('returns false if website scan request is missing scanType', () => {
        const websiteScanRequest = { websiteId };
        expect(isValidWebsiteScanRequestObject(websiteScanRequest as WebsiteScanRequest)).toBe(false);
    });

    it('returns false if website scan request has invalid scan type', () => {
        const websiteScanRequest = {
            websiteId,
            scanType: 'invalid scan type',
        };
        expect(isValidWebsiteScanRequestObject(websiteScanRequest as WebsiteScanRequest)).toBe(false);
    });
});
