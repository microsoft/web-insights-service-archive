// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemTypes } from './item-type';
import { StorageDocument } from './storage-document';

export interface Page extends StorageDocument {
    itemType: ItemTypes['page'];
    websiteId: string; // maps to a Website document
    url: string;
    lastScanTimestamp?: number;
}
