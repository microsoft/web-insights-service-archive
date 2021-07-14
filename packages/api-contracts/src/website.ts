// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as StorageDocuments from 'storage-documents';
import { Page } from './page';

export interface Website extends Omit<StorageDocuments.Website, keyof StorageDocuments.StorageDocument> {
    id: string;
    pages: Page[];
}
