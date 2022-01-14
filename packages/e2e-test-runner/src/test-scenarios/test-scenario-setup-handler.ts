// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { client } from 'azure-services';
import { inject, injectable } from 'inversify';
import { E2ETestDataProvider } from 'service-library';
import { WebInsightsClientProvider, WebInsightsServiceClientTypeNames } from 'storage-api-client';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestScenarioDefinition } from './test-scenario-definitions';

@injectable()
export class TestScenarioSetupHandler {
    constructor(
        @inject(E2ETestDataProvider) private readonly testDataProvider: E2ETestDataProvider,
        @inject(WebInsightsServiceClientTypeNames.WebInsightsClientProvider)
        private readonly webInsightsClientProvider: WebInsightsClientProvider,
    ) {}

    public async setUpTestScenario(testScenario: TestScenarioDefinition): Promise<TestContextData> {
        const websiteBlob = await this.readTestWebsiteBlob(testScenario);
        const postedWebsite = await this.postTestWebsite(websiteBlob);

        return { websiteId: postedWebsite.id, websiteScans: [] };
    }

    private async readTestWebsiteBlob(testScenario: TestScenarioDefinition): Promise<ApiContracts.Website> {
        const response = await this.testDataProvider.readTestWebsite(testScenario.websiteDataBlobName);

        if (response.error) {
            const blobName = testScenario.websiteDataBlobName;
            throw new Error(`Unable to read test website blob ${blobName}: ${JSON.stringify(response.error)}`);
        }

        return response.item;
    }

    private async postTestWebsite(website: ApiContracts.Website): Promise<ApiContracts.Website | undefined> {
        const webInsightsClient = await this.webInsightsClientProvider();
        const websiteResponse = await webInsightsClient.postWebsite(website);
        if (!client.isSuccessStatusCode(websiteResponse)) {
            const statusCode = websiteResponse.statusCode;
            throw new Error(`Error attempting to POST website: status code ${statusCode}`);
        }

        return websiteResponse.body;
    }
}
