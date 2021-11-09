// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { Agents, ExtendOptions, Got, Options } from 'got';
import { IMock, It, Mock } from 'typemoq';
import { RetryHelper } from 'common';
import { Logger } from 'logger';
import { WebInsightsStorageClient } from './web-insights-storage-client';

describe(WebInsightsStorageClient, () => {
    const baseUrl = 'base-url';
    const apiVersion = '1.0';
    const maxRetryCount = 5;
    const msecBetweenRetries = 10;

    let gotStub: Got;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let getMock: IMock<(url: string, options?: Options) => {}>;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let postMock: IMock<(url: string, options?: Options) => {}>;
    let retryHelperMock: IMock<RetryHelper<unknown>>;
    let loggerMock: IMock<Logger>;
    let getAgentsMock: IMock<() => Agents>;
    // let error: Error;
    let response: unknown;
    const agentsStub = {};

    let testSubject: WebInsightsStorageClient;

    beforeEach(() => {
        // error = new Error('HTTP 500 Server Error');
        response = { statusCode: 200 };

        getMock = Mock.ofInstance(() => {
            return null;
        });
        postMock = Mock.ofInstance(() => {
            return null;
        });
        gotStub = {
            extend: (options: ExtendOptions) => gotStub,
            get: getMock.object,
            post: postMock.object,
        } as Got;
        loggerMock = Mock.ofType<Logger>();
        retryHelperMock = Mock.ofType<RetryHelper<unknown>>();
        getAgentsMock = Mock.ofType<() => Agents>();
        getAgentsMock.setup((ga) => ga()).returns(() => agentsStub);

        testSubject = new WebInsightsStorageClient(
            baseUrl,
            loggerMock.object,
            false,
            apiVersion,
            gotStub,
            getAgentsMock.object,
            retryHelperMock.object,
            maxRetryCount,
            msecBetweenRetries,
        );
    });

    afterEach(() => {
        retryHelperMock.verifyAll();
        postMock.verifyAll();
        getMock.verifyAll();
        getAgentsMock.verifyAll();
    });

    it('postWebsite sends POST request with expected properties', async () => {
        const website = ApiContracts.websiteWithRequiredProperties;
        const requestOptions = { json: website };

        setupRetryHelperMock();
        postMock
            .setup((req) => req(`${baseUrl}/websites`, requestOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable();

        await testSubject.postWebsite(website);
    });

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup((r) => r.executeWithRetries(It.isAny(), It.isAny(), maxRetryCount, msecBetweenRetries))
            .returns(async (action: () => Promise<unknown>, errorHandler: (error: Error) => Promise<void>, maxAttempts: number) => {
                await action();
            })
            .verifiable();
    }
});
