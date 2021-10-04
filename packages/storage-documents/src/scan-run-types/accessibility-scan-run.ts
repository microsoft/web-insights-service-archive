// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanRun } from './scan-run';

export declare type AccessibilityScanErrorTypes =
    | 'UrlNavigationTimeout'
    | 'SslError'
    | 'ResourceLoadFailure'
    | 'InvalidUrl'
    | 'EmptyPage'
    | 'HttpErrorCode'
    | 'NavigationError'
    | 'InvalidContentType'
    | 'UrlNotResolved'
    | 'ScanTimeout'
    | 'InternalError';

export interface AccessibilityScanError {
    errorType: AccessibilityScanErrorTypes;
    message: string;
}

export interface AccessibilityScanRun extends ScanRun {
    error?: string | AccessibilityScanError;
    pageTitle?: string;
    scannedUrl?: string;
    pageResponseCode?: number;
}
