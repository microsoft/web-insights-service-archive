// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from './storage-document';

export interface Page extends StorageDocument {
    websiteId: string; // maps to a Website document
    url: string;
    lastScanDate?: Date;
}
