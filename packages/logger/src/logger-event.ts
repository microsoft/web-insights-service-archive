// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type LoggerEvent =
    | 'HealthCheck'
    | 'FunctionalTest'
    | 'ScanRequestReceived'
    | 'ScanRequestAccepted'
    | 'ScanRequestQueued'
    | 'ScanRequestRunning'
    | 'ScanRequestCompleted'
    | 'ScanRequestFailed'
    | 'ScanTaskStarted'
    | 'ScanTaskCompleted'
    | 'ScanTaskFailed'
    | 'BrowserScanFailed';
