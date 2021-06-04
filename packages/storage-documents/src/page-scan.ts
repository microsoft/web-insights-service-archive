// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanStatus } from './scan-types';
import { StorageDocument } from './storage-document';

export type PageReportFormat = 'sarif' | 'html';

export type ReportData = {
    reportId: string;
    format: PageReportFormat;
    href: string;
};

// Each doc corresponds to one url/scan type combination
// must have a unique combination of websiteScanId and url (use both for the id)
export interface PageScan extends StorageDocument {
    websiteScanId: string; // maps to a WebsiteScan
    url: string;
    priority: number;
    scanStatus: ScanStatus;
    lastScanDate?: Date;
    // nextScanDate: Date;
    frequency: number;
    resultsBlobId?: string;
    reports?: ReportData[];
    retryCount: number;
    scanError?: string;
}
