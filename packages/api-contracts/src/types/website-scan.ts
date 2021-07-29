// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportData, ScanStatus, ScanType } from 'storage-documents';
import { PageScan } from './page-scan';

export interface WebsiteScan {
    id: string;
    websiteId: string;
    scanType: ScanType;
    scanFrequency: string;
    scanStatus: ScanStatus;
    reports?: ReportData[];
    pageScans?: PageScan[];
}
