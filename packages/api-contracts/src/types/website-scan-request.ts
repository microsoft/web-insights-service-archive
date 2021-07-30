// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanType } from 'storage-documents';

export interface WebsiteScanRequest {
    websiteId: string;
    scanType: ScanType;
    priority?: number;
    scanFrequency?: string; // cron expression
}
