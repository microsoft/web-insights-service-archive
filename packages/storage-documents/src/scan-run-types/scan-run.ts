// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type PageScanRunState = 'pending' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';

export interface ScanRun {
    timestamp?: number;
    retryCount?: number;
    state: PageScanRunState;
}
