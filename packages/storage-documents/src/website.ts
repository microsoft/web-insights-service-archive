// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanType } from './scan-types';
import { StorageDocument } from './storage-document';

export interface Website extends StorageDocument {
    baseUrl: string;
    priority: number;
    discoveryPatterns: string[];
    knownPages: string[];
    scanners: ScanType[];
    // other site attributes
}
