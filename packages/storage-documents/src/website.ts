// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from './storage-document';

export type ScanType = 'a11y' | 'privacy' | 'security';

export interface Website extends StorageDocument {
    baseUrl: string;
    priority: number;
    discoveryPatterns: string[];
    knownPages: string[];
    scanners: ScanType[];
    scanFrequency: number;
}
