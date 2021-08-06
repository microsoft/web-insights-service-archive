// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobResultData, ReportData, ScanStatus } from 'storage-documents';
import { Page } from './page';

export interface PageScan {
    id: string;
    websiteScanId?: string;
    page: Page;
    priority: number;
    scanStatus: ScanStatus;
    completedTimestamp?: number;
    results?: BlobResultData[];
    reports?: ReportData[];
    scanError?: string;
}
