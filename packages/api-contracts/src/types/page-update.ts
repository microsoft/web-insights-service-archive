// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanType } from 'storage-documents';

export interface PageUpdate {
    pageId: string;
    disabledScans?: ScanType[];
}
