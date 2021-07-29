// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportData, ScanStatus } from 'storage-documents';
import { Page } from './page';

export interface PageScan {
    id: string;
    websiteScanId: string;
    page: Page;
    priority: number;
    scanStatus: ScanStatus;
    completedTimestamp?: number;
    resultsBlobId?: string;
    reports?: ReportData[];
    scanError?: string;
}
