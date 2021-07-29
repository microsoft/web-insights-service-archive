// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemTypes } from './item-type';
import { ReportData } from './report-data';
import { ScanStatus, ScanType } from './scan-types';
import { StorageDocument } from './storage-document';

/*
 * Represents a scan/crawl of a full website for one scan type
 */
export interface WebsiteScan extends StorageDocument {
    itemType: ItemTypes['websiteScan'];
    websiteId: string; // Maps to a Website
    scanType: ScanType;
    scanFrequency: string; // cron expression
    scanStatus: ScanStatus;
    reports?: ReportData[];
}
