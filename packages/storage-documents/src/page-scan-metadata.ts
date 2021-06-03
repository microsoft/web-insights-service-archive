// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanStatus } from './scan-types';
import { StorageDocument } from './storage-document';
import { ScanType } from './website';

export type ReportFormat = 'sarif' | 'html' | 'consolidated.html';

// Each doc corresponds to one url/scan type combination
export interface PageScanMetadata extends StorageDocument {
    websiteId: string;
    url: string;
    priority: number;
    scanType: ScanType;
    scanStatus: ScanStatus;
    lastScanDate?: Date;
    // nextScanDate: Date;
    frequency: number;
    resultsBlobId: string;
    reports: [
        {
            reportId: string;
            format: ReportFormat;
            href: string;
        },
    ];
    retryCount: string;
}
