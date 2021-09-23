// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobResultData } from '..';
import { ScanResult } from './scan-result';

export interface AccessibilityScanResult extends ScanResult {
    issueCount?: number;
    axeResultBlob?: BlobResultData;
}
