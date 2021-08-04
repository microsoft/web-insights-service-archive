// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebsiteScan } from '../types/website-scan';

export const newWebsiteScan: WebsiteScan = {
    id: 'pending website scan id',
    websiteId: 'website id',
    scanType: 'a11y',
    scanFrequency: '0 0 0 ? * 1#1 *',
    scanStatus: 'pending',
    priority: 0,
};
