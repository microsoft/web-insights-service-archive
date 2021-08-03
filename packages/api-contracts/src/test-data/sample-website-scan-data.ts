// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebsiteScan } from '../types/website-scan';
import { passedPageScan, pendingPageScan } from './sample-page-scan-data';

export const newWebsiteScan: WebsiteScan = {
    id: 'pending website scan id',
    websiteId: 'website id',
    scanType: 'a11y',
    scanFrequency: '0 0 0 ? * 2#1 *',
    scanStatus: 'pending',
    priority: 0,
};

export const pendingWebsiteScanWithPages: WebsiteScan = {
    id: 'pending website scan id',
    websiteId: 'website id',
    scanType: 'a11y',
    scanFrequency: '0 0 0 ? * 2#1 *',
    scanStatus: 'pending',
    priority: 0,
    pageScans: [pendingPageScan, passedPageScan],
};
