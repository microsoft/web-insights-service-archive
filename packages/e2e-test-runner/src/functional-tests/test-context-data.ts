// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanType } from 'storage-documents';

export interface TestWebsiteScan {
    scanType: ScanType;
    scanId: string;
}

export interface TestContextData {
    websiteId: string;
    websiteScans: TestWebsiteScan[];
}
