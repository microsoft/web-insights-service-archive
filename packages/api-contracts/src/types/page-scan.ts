// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportData, ScanResult, ScanRun } from 'storage-documents';
import { Page } from './page';

export interface PageScan {
    id: string;
    websiteScanId?: string;
    page: Page;
    priority: number;
    reports?: ReportData[];
    result?: ScanResult;
    run: ScanRun;
}
