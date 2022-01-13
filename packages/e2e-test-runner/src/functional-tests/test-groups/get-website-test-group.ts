// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isValidWebsiteObject } from 'api-contracts';
import { expect } from 'chai';
import { WebApiErrorCodes } from 'service-library';
import { TestEnvironment } from '../common-types';
import { FunctionalTestGroup } from '../functional-test-group';
import { TestContextData } from '../test-context-data';
import { test } from '../test-decorator';

export class GetWebsiteTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async getInvalidGuidFails(testContextData: TestContextData): Promise<void> {
        const getWebsiteResponse = await this.webInsightsClient.getWebsite('invalid guid');

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, getWebsiteResponse);
    }

    @test(TestEnvironment.all)
    public async getNonexistantWebsiteFails(testContextData: TestContextData): Promise<void> {
        const newGuid = this.guidGenerator.createGuid();
        const getWebsiteResponse = await this.webInsightsClient.getWebsite(newGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, getWebsiteResponse);
    }

    @test(TestEnvironment.all)
    public async getWebsiteSucceeds(testContextData: TestContextData): Promise<void> {
        const getWebsiteResponse = await this.webInsightsClient.getWebsite(testContextData.websiteId);
        this.ensureResponseSuccessStatusCode(getWebsiteResponse);

        const website = getWebsiteResponse.body;
        expect(website.id).to.be.equal(testContextData.websiteId);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(isValidWebsiteObject(website), 'get website should return a valid website').to.be.true;
    }
}
