// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanStatus } from './scan-types';
import { StorageDocument } from './storage-document';
import { ScanType } from './website';

export type WebsiteReport = {
    reportId: string;
    format: 'consolidated.html';
    href: string;
};

// Summary of completed scan/crawl of full website, for one scan type (a11y, privacy, or security)
export interface WebsiteScan extends StorageDocument {
    websiteId: string; // Maps to a Website
    scanType: ScanType;
    scanStatus: ScanStatus;
    lastScanCompletedDate?: Date;
    report: WebsiteReport[];
    retryCount: string;
    // urls: string[];
}
