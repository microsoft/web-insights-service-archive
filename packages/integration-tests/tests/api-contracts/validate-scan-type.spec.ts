// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { isValidScanType } from 'api-contracts';
import { ScanType } from 'storage-documents';

describe(isValidScanType, () => {
    it.each(['a11y', 'security', 'privacy'])('Returns true for scanType=%s', (scanType) => {
        expect(isValidScanType(scanType as ScanType)).toBeTruthy();
    });

    it('returns false for invalid scan type', () => {
        expect(isValidScanType('invalidType' as ScanType)).toBeFalsy();
    });
});
