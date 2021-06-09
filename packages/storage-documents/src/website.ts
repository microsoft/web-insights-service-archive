// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanType } from './scan-types';
import { StorageDocument } from './storage-document';

export interface Website extends StorageDocument {
    name: string;
    baseUrl: string;
    priority: number;
    discoveryPatterns: string[];
    knownPages: string[];
    scanners: ScanType[];
    domainId: string;
    owners?: string[];
    orgCvp?: string;
    usingUhf?: boolean;
    compliant: boolean;
    enableCrawler: boolean;
    deleted: boolean;
    divisionId?: number;
    siteStateId?: number;
    noBanner: boolean;
    noBannerReasonId?: number;
    serviceTreeId: string;
    notes?: string;
    alias?: string;
    organizationId?: number;
    celaAccessibilityContacts?: string[];
    privagyEGRCExceptionId?: string;
    AIEGRCExceptionId?: boolean;
    optOutSecurityReason?: string;
    isCustomBanner: boolean;
    isMicrosoftOwned: boolean;
    requireAuthentication?: boolean;
    manageCookieXpath?: string;
    isCookieManagable: boolean;
}
