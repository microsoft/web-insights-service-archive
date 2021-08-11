// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { is } from 'typescript-is';
import { ScanType } from 'storage-documents';
import { PageUpdate } from './types/page-update';
import { Website } from './types/website';
import { WebsiteScanRequest } from './types/website-scan-request';

export type ApiObjectValidator<T> = (obj: T) => boolean;

export const isValidWebsiteObject: ApiObjectValidator<Website> = (obj) => {
    return is<Website>(obj);
};

export const isValidPageUpdateObject: ApiObjectValidator<PageUpdate> = (obj) => {
    return is<PageUpdate>(obj);
};

export const isValidWebsiteScanRequestObject: ApiObjectValidator<WebsiteScanRequest> = (obj) => {
    return is<WebsiteScanRequest>(obj);
};

export const isValidScanType: ApiObjectValidator<ScanType> = (scanType) => {
    return is<ScanType>(scanType);
};
