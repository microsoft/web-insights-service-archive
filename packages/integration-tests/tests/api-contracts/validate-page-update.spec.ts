// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { isValidPageUpdateObject, PageUpdate } from 'api-contracts';
import { ScanType } from 'storage-documents';

describe(isValidPageUpdateObject, () => {
    it('returns true for page update with all required properties', () => {
        const pageUpdate: PageUpdate = {
            pageId: 'id',
        };
        expect(isValidPageUpdateObject(pageUpdate)).toBeTruthy();
    });

    it('returns true for page update with all properties', () => {
        const pageUpdate: PageUpdate = {
            pageId: 'id',
            disabledScans: ['a11y'],
        };
        expect(isValidPageUpdateObject(pageUpdate)).toBeTruthy();
    });

    it('returns false if required properties are missing', () => {
        const pageUpdate = {
            disabledScans: ['a11y'],
        } as PageUpdate;
        expect(isValidPageUpdateObject(pageUpdate)).toBeFalsy();
    });

    it('returns false if disabled scans contains an invalid scan type', () => {
        const pageUpdate: PageUpdate = {
            pageId: 'id',
            disabledScans: ['invalidScanType'] as unknown as ScanType[],
        };
        expect(isValidPageUpdateObject(pageUpdate)).toBeFalsy();
    });
});
