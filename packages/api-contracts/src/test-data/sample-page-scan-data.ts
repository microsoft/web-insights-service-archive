// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PageScan } from '../types/page-scan';

export const pendingPageScan: PageScan = {
    id: 'pending page scan id',
    websiteScanId: 'website id',
    page: {
        id: 'pending page id',
        url: 'https://pending-page.com',
    },
    priority: 1,
    scanStatus: 'pending',
};

export const passedPageScan: PageScan = {
    id: 'passed page scan id',
    websiteScanId: 'website id',
    page: {
        id: 'passed page id',
        url: 'https://passed-page.com',
    },
    priority: 1,
    scanStatus: 'pass',
    completedTimestamp: 123456,
    results: [
        {
            blobId: 'results blob id',
            resultType: 'result type',
        },
    ],
    reports: [
        {
            reportId: 'passed page html report id',
            format: 'html',
            href: 'https://page-reports/passed.html',
        },
        {
            reportId: 'passed page sarif report id',
            format: 'sarif',
            href: 'https://page-reports/passed.json',
        },
    ],
};
