// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type PageReportFormat = 'sarif' | 'html' | 'consolidated.html';

export type ReportData = {
    reportId: string;
    format: PageReportFormat;
    href: string;
};
