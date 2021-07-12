// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DocumentDataOnly, Website } from 'storage-documents';

export interface GetWebsiteResponse extends DocumentDataOnly<Website> {
    id: string;
    pages: PageData[];
}

export interface PageData {
    id: string;
    url: string;
    lastScanTimestamp?: number;
}
