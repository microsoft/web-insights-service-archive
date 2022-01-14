// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { expect } from 'chai';
import { websiteWithRequiredProperties } from 'api-contracts';
import { WebApiErrorCodes } from 'service-library';
import { Website } from 'storage-documents';
import _ from 'lodash';
import { TestEnvironment } from '../common-types';
import { FunctionalTestGroup } from '../functional-test-group';
import { TestContextData } from '../test-context-data';
import { test } from '../test-decorator';

export class PostWebsiteTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async failsWithInvalidWebsite(testContextData: TestContextData): Promise<void> {
        const response = await this.webInsightsClient.postWebsite({ name: 'invalid website' } as Website);

        this.expectWebApiErrorResponse(WebApiErrorCodes.malformedRequest, response);
    }

    @test(TestEnvironment.all)
    public async failsWithDisallowedWebsiteProperties(testContextData: TestContextData): Promise<void> {
        const website = _.cloneDeep(websiteWithRequiredProperties);
        website.pages = [{ id: 'page id', url: 'http://pageurl.com/' }];
        const response = await this.webInsightsClient.postWebsite(website);

        this.expectWebApiErrorResponse(WebApiErrorCodes.malformedRequest, response);
    }

    @test(TestEnvironment.all)
    public async failsWithInvalidGuid(testContextData: TestContextData): Promise<void> {
        const website = _.cloneDeep(websiteWithRequiredProperties);
        website.id = 'invalid guid';
        const response = await this.webInsightsClient.postWebsite(website);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async postNewWebsite(testContextData: TestContextData): Promise<void> {
        const testWebsiteResponse = await this.webInsightsClient.getWebsite(testContextData.websiteId);
        this.ensureResponseSuccessStatusCode(testWebsiteResponse);

        const newTestWebsite = _.omit(testWebsiteResponse.body, ['id', 'pages']);

        let newWebsite: ApiContracts.Website;

        // try/catch/finally ensures we will always clean up the new website
        try {
            const newWebsiteResponse = await this.webInsightsClient.postWebsite(newTestWebsite);
            this.ensureResponseSuccessStatusCode(newWebsiteResponse);

            newWebsite = newWebsiteResponse.body;
            expect(newWebsiteResponse.statusCode).to.be.equal(201);
            expect(newWebsiteResponse.body).deep.include(newTestWebsite);
            expect(newWebsiteResponse.body.pages, 'Expect post website to create a page document for each knownPage url').to.be.length(
                newTestWebsite.knownPages.length,
            );
            // eslint-disable-next-line no-useless-catch
        } catch (e) {
            throw e;
        } finally {
            if (newWebsite !== undefined) {
                await Promise.all(newWebsite.pages.map((page) => this.pageProvider.deletePage(page.id)));
                await this.websiteProvider.deleteWebsite(newWebsite.id);
            }
        }
    }

    @test(TestEnvironment.all)
    public async postExistingWebsite(testContextData: TestContextData): Promise<void> {
        const testWebsiteResponse = await this.webInsightsClient.getWebsite(testContextData.websiteId);
        this.ensureResponseSuccessStatusCode(testWebsiteResponse);

        const websiteName = testWebsiteResponse.body.name;
        const updatedWebsiteName = `${websiteName} - updated`;
        const websiteUpdate: ApiContracts.Website = {
            ...testWebsiteResponse.body,
            pages: undefined,
            name: updatedWebsiteName,
        };

        const postWebsiteResponse = await this.webInsightsClient.postWebsite(websiteUpdate);
        this.ensureResponseSuccessStatusCode(postWebsiteResponse);

        expect(postWebsiteResponse.statusCode).to.be.equal(200);
        expect(postWebsiteResponse.body).deep.include(_.omit(websiteUpdate, 'pages'));
    }
}
