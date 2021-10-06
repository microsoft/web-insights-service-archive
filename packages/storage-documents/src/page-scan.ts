// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportData } from './report-data';
import { StorageDocument } from './storage-document';
import { ItemTypes } from './item-type';
import { ScanResult } from './scan-result-types/scan-result';
import { ScanRun } from './scan-run-types/scan-run';
import { AccessibilityScanResult } from './scan-result-types/accessibility-scan-result';
import { AccessibilityScanRun } from './scan-run-types/accessibility-scan-run';

/*
 * Represents a scan/crawl of a single URL for one scan type.
 * Must have a unique combination of pageId and websiteScanId.
 */
export interface PageScan extends StorageDocument {
    itemType: ItemTypes['pageScan'];
    websiteScanId: string; // maps to a WebsiteScan document
    pageId: string; // maps to a Page document
    priority: number;
    reports?: ReportData[];
    result?: ScanResult;
    run: ScanRun;
}

export interface AccessibilityPageScan extends PageScan {
    result: AccessibilityScanResult;
    run: AccessibilityScanRun;
}
