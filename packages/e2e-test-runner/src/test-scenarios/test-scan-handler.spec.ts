// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { WebInsightsStorageClient } from 'storage-api-client';
import { IMock, Mock } from 'typemoq';
import { ResponseWithBodyType } from 'common';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { TestScanHandler } from './test-scan-handler';

describe(TestScanHandler, () => {
    let webInsightsClientMock: IMock<WebInsightsStorageClient>;
    const currentDate = new Date(0, 0, 2, 3, 4, 5); // year, month(0-indexed), day, hour, minute, second
    const scanType = 'a11y';
    const websiteId = 'website id';

    let testSubject: TestScanHandler;

    beforeEach(() => {
        webInsightsClientMock = Mock.ofType<WebInsightsStorageClient>();
        getPromisableDynamicMock(webInsightsClientMock);

        testSubject = new TestScanHandler(
            async () => webInsightsClientMock.object,
            () => currentDate,
        );
    });

    it('submitTestScan posts a website scan with expected properties', async () => {
        const expectedScanRequest: ApiContracts.WebsiteScanRequest = {
            websiteId,
            scanType,
            scanFrequency: '5 4 3 2 1 ?', // second, minute, hour, day, month (1-indexed), day-of-week
        };
        const response = { statusCode: 201 } as ResponseWithBodyType<ApiContracts.WebsiteScan>;

        webInsightsClientMock
            .setup((c) => c.postWebsiteScan(expectedScanRequest))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.submitTestScan(scanType, websiteId);

        expect(actualResponse).toBe(response);
    });
});
