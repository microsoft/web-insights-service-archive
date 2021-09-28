// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type ScanResultState = 'pass' | 'fail';

export interface ScanResult {
    state: ScanResultState;
}
