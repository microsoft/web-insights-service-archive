// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { E2ETestDataProvider, E2ETestDataReadResponse } from 'service-library';
import { WebInsightsStorageClient } from 'storage-api-client';
import { IMock, Mock } from 'typemoq';
import { ResponseWithBodyType } from 'common';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { TestScenarioDefinition } from './test-scenario-definitions';

import { TestScenarioSetupHandler } from './test-scenario-setup-handler';

describe(TestScenarioSetupHandler, () => {
    const blobName = 'blob name';
    const testScenario = {
        websiteDataBlobName: blobName,
    } as TestScenarioDefinition;
    const website = { id: 'website id' } as ApiContracts.Website;
    let webInsightsClientMock: IMock<WebInsightsStorageClient>;
    let testDataProviderMock: IMock<E2ETestDataProvider>;

    let testSubject: TestScenarioSetupHandler;

    beforeEach(() => {
        webInsightsClientMock = Mock.ofType<WebInsightsStorageClient>();
        getPromisableDynamicMock(webInsightsClientMock);
        testDataProviderMock = Mock.ofType<E2ETestDataProvider>();

        testSubject = new TestScenarioSetupHandler(testDataProviderMock.object, async () => webInsightsClientMock.object);
    });

    it('Throws if blob read fails', () => {
        const blobReadResponse: E2ETestDataReadResponse<ApiContracts.Website> = {
            error: {
                errorCode: 'blobNotFound',
            },
        };
        testDataProviderMock.setup((t) => t.readTestWebsite(blobName)).returns(async () => blobReadResponse);

        expect(testSubject.setUpTestScenario(testScenario)).rejects.toThrow();
    });

    it('Throws if post website fails', () => {
        const blobReadResponse: E2ETestDataReadResponse<ApiContracts.Website> = {
            item: website,
        };
        const postResponse = {
            statusCode: 404,
        } as ResponseWithBodyType<ApiContracts.Website>;
        testDataProviderMock.setup((t) => t.readTestWebsite(blobName)).returns(async () => blobReadResponse);
        webInsightsClientMock.setup((w) => w.postWebsite(website)).returns(async () => postResponse);

        expect(testSubject.setUpTestScenario(testScenario)).rejects.toThrow();
    });

    it('Returns expected testContextData if blob read and post succeed', async () => {
        const blobReadResponse: E2ETestDataReadResponse<ApiContracts.Website> = {
            item: website,
        };
        const postResponse = {
            statusCode: 200,
            body: website,
        } as ResponseWithBodyType<ApiContracts.Website>;
        testDataProviderMock.setup((t) => t.readTestWebsite(blobName)).returns(async () => blobReadResponse);
        webInsightsClientMock.setup((w) => w.postWebsite(website)).returns(async () => postResponse);

        const testContextData = await testSubject.setUpTestScenario(testScenario);

        expect(testContextData).toEqual({ websiteId: website.id });
    });
});
