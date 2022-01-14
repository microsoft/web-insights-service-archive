// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { WebApiErrorCodes } from 'service-library';
import { ScanType } from 'storage-documents';
import { TestEnvironment } from '../common-types';
import { FunctionalTestGroup } from '../functional-test-group';
import { TestContextData, TestWebsiteScan } from '../test-context-data';
import { test } from '../test-decorator';

export class GetWebsiteScanTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async failsWithInvalidWebsiteId(testContextData: TestContextData): Promise<void> {
        const { scanType, scanId } = testContextData.websiteScans[0];
        const response = await this.webInsightsClient.getWebsiteScan('invalid guid', scanType, scanId);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async failsWithInvalidScanId(testContextData: TestContextData): Promise<void> {
        const response = await this.webInsightsClient.getWebsiteScan(testContextData.websiteId, 'a11y', 'invalid guid');

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async failsWithInvalidScanType(testContextData: TestContextData): Promise<void> {
        const { scanId } = testContextData.websiteScans[0];
        const response = await this.webInsightsClient.getWebsiteScan(testContextData.websiteId, 'invalid scan type' as ScanType, scanId);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidScanType, response);
    }

    @test(TestEnvironment.all)
    public async getScanWithId(testContextData: TestContextData): Promise<void> {
        await Promise.all(
            testContextData.websiteScans.map(async (websiteScan: TestWebsiteScan) => {
                const response = await this.webInsightsClient.getWebsiteScan(
                    testContextData.websiteId,
                    websiteScan.scanType,
                    websiteScan.scanId,
                );

                this.ensureResponseSuccessStatusCode(response);
                expect(response.body.id).to.be.equal(websiteScan.scanId);
                expect(response.body.scanType).to.be.equal(websiteScan.scanType);
            }),
        );
    }

    @test(TestEnvironment.all)
    public async getLatestScan(testContextData: TestContextData): Promise<void> {
        await Promise.all(
            testContextData.websiteScans.map(async (websiteScan: TestWebsiteScan) => {
                const response = await this.webInsightsClient.getLatestWebsiteScan(testContextData.websiteId, websiteScan.scanType);

                this.ensureResponseSuccessStatusCode(response);
                expect(response.body.id).to.be.equal(websiteScan.scanId);
                expect(response.body.scanType).to.be.equal(websiteScan.scanType);
            }),
        );
    }
}
