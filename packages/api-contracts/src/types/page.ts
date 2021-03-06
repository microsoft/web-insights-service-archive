// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanType } from 'storage-documents';

export interface Page {
    id?: string;
    websiteId?: string;
    url: string;
    lastScanTimestamp?: number;
    disabledScans?: ScanType[];
}
