// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportData } from './report-data';
import { ScanStatus } from './scan-types';
import { StorageDocument } from './storage-document';

/*
 * Represents a scan/crawl of a single URL for one scan type.
 * Must have a unique combination of pageId and websiteScanId.
 */
export interface PageScan extends StorageDocument {
    websiteScanId: string; // maps to a WebsiteScan document
    pageId: string; // maps to a Page document
    priority: number;
    scanStatus: ScanStatus;
    startDate: Date;
    completedDate?: Date;
    resultsBlobId?: string;
    reports?: ReportData[];
    retryCount: number;
    scanError?: string;
}
