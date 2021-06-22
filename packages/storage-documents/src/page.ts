// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from './item-type';
import { StorageDocument } from './storage-document';

export interface Page extends StorageDocument {
    itemType: ItemType.page;
    websiteId: string; // maps to a Website document
    url: string;
    lastScanDate?: Date;
}
