// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { WebApiErrorCodes } from 'service-library';
import { TestEnvironment } from '../common-types';
import { FunctionalTestGroup } from '../functional-test-group';
import { TestContextData } from '../test-context-data';
import { test } from '../test-decorator';

export class PostWebsiteScanTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async failsWithInvalidWebsiteScanRequest(testContextData: TestContextData): Promise<void> {
        const invalidWebsiteScanRequest = { scanType: 'a11y' } as ApiContracts.WebsiteScanRequest;
        const postWebsiteScanResponse = await this.webInsightsClient.postWebsiteScan(invalidWebsiteScanRequest);

        this.expectWebApiErrorResponse(WebApiErrorCodes.malformedRequest, postWebsiteScanResponse);
    }

    @test(TestEnvironment.all)
    public async failsWithInvalidWebsiteId(testContextData: TestContextData): Promise<void> {
        const websiteScanRequest: ApiContracts.WebsiteScanRequest = {
            websiteId: 'invalid guid',
            scanType: 'a11y',
        };

        const postWebsiteScanResponse = await this.webInsightsClient.postWebsiteScan(websiteScanRequest);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, postWebsiteScanResponse);
    }

    @test(TestEnvironment.all)
    public async failsWithNonexistantWebsiteId(testContextData: TestContextData): Promise<void> {
        const newGuid = this.guidGenerator.createGuid();
        const websiteScanRequest: ApiContracts.WebsiteScanRequest = {
            websiteId: newGuid,
            scanType: 'a11y',
        };

        const postWebsiteScanResponse = await this.webInsightsClient.postWebsiteScan(websiteScanRequest);

        this.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, postWebsiteScanResponse);
    }

    @test(TestEnvironment.all)
    public async failsWithInvalidPriority(testContextData: TestContextData): Promise<void> {
        const invalidPriorities = [9999, -9999];
        await Promise.all(
            invalidPriorities.map(async (priority) => {
                const websiteScanRequest: ApiContracts.WebsiteScanRequest = {
                    websiteId: testContextData.websiteId,
                    scanType: 'a11y',
                    priority: priority,
                };

                const postWebsiteScanResponse = await this.webInsightsClient.postWebsiteScan(websiteScanRequest);

                this.expectWebApiErrorResponse(WebApiErrorCodes.outOfRangePriority, postWebsiteScanResponse);
            }),
        );
    }

    @test(TestEnvironment.all)
    public async failsWithInvalidCronExpression(testContextData: TestContextData): Promise<void> {
        const websiteScanRequest: ApiContracts.WebsiteScanRequest = {
            websiteId: testContextData.websiteId,
            scanType: 'a11y',
            scanFrequency: 'invalid cron expression',
        };

        const postWebsiteScanResponse = await this.webInsightsClient.postWebsiteScan(websiteScanRequest);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidFrequencyExpression, postWebsiteScanResponse);
    }
}
