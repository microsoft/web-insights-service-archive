// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface BaseTelemetryMeasurements {
    [name: string]: number;
}

// ScanRequest events
export interface ScanRequestReceivedMeasurements extends BaseTelemetryMeasurements {
    totalScanRequests: number;
    pendingScanRequests: number;
    rejectedScanRequests: number;
}

export interface ScanRequestAcceptedMeasurements extends BaseTelemetryMeasurements {
    acceptedScanRequests: number;
}

export interface ScanRequestQueuedMeasurements extends BaseTelemetryMeasurements {
    queuedScanRequests: number;
}

export interface ScanRequestRunningMeasurements extends BaseTelemetryMeasurements {
    runningScanRequests: number;
}

export interface ScanRequestCompletedMeasurements extends BaseTelemetryMeasurements {
    completedScanRequests: number;
}

export interface ScanRequestFailedMeasurements extends BaseTelemetryMeasurements {
    failedScanRequests: number;
}

// ScanTask events
export interface ScanTaskStartedMeasurements extends BaseTelemetryMeasurements {
    scanWaitTime: number;
    startedScanTasks: number;
}

export interface ScanTaskCompletedMeasurements extends BaseTelemetryMeasurements {
    scanExecutionTime: number;
    scanTotalTime: number;
    completedScanTasks: number;
}

export interface ScanTaskFailedMeasurements extends BaseTelemetryMeasurements {
    failedScanTasks: number;
}

export interface BrowserScanFailedMeasurements extends BaseTelemetryMeasurements {
    failedBrowserScans: number;
}

export type TelemetryMeasurements = {
    HealthCheck: null;
    FunctionalTest: null;
    ScanRequestReceived: ScanRequestReceivedMeasurements;
    ScanRequestAccepted: ScanRequestAcceptedMeasurements;
    ScanRequestQueued: ScanRequestQueuedMeasurements;
    ScanRequestRunning: ScanRequestRunningMeasurements;
    ScanRequestCompleted: ScanRequestCompletedMeasurements;
    ScanRequestFailed: ScanRequestFailedMeasurements;
    ScanTaskStarted: ScanTaskStartedMeasurements;
    ScanTaskCompleted: ScanTaskCompletedMeasurements;
    ScanTaskFailed: ScanTaskFailedMeasurements;
    BrowserScanFailed: BrowserScanFailedMeasurements;
};
