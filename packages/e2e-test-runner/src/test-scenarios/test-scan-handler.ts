// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { ResponseWithBodyType } from 'common';
import { inject, injectable } from 'inversify';
import { WebInsightsClientProvider, WebInsightsServiceClientTypeNames } from 'storage-api-client';
import { ScanType } from 'storage-documents';

@injectable()
export class TestScanHandler {
    constructor(
        @inject(WebInsightsServiceClientTypeNames.WebInsightsClientProvider)
        private readonly webInsightsClientProvider: WebInsightsClientProvider,
        private readonly getCurrentDate: () => Date = () => new Date(),
    ) {}

    public async submitTestScan(scanType: ScanType, websiteId: string): Promise<ResponseWithBodyType<ApiContracts.WebsiteScan>> {
        const scanRequest: ApiContracts.WebsiteScanRequest = {
            websiteId: websiteId,
            scanType: scanType,
            scanFrequency: this.createCronExpressionFromDatetime(this.getCurrentDate()),
        };
        const webInsightsClient = await this.webInsightsClientProvider();

        return webInsightsClient.postWebsiteScan(scanRequest);
    }

    private createCronExpressionFromDatetime(datetime: Date): string {
        const second = datetime.getSeconds();
        const minute = datetime.getMinutes();
        const hour = datetime.getHours();
        const dayOfMonth = datetime.getDate();
        const month = datetime.getMonth() + 1; // cron-parser uses 1-indexed months while Date uses 0-indexed months

        return `${second} ${minute} ${hour} ${dayOfMonth} ${month} ?`;
    }
}
