// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { Agents, ExtendOptions, Got, Options } from 'got';
import { IMock, It, Mock } from 'typemoq';
import { RetryHelper, ServiceConfiguration } from 'common';
import { ConsoleLoggerClient, GlobalLogger, Logger } from 'logger';
import { WebInsightsStorageClient } from './web-insights-storage-client';

describe(WebInsightsStorageClient, () => {
    const baseUrl = 'base-url';
    const apiVersion = '1.0';
    const maxRetryCount = 5;
    const msecBetweenRetries = 10;

    let gotStub: Got;
    let extendMock: IMock<(options: Options) => Got>;
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

        extendMock = Mock.ofInstance(() => gotStub);
        extendMock.setup((e) => e(It.isAny())).returns(() => gotStub);
        getMock = Mock.ofInstance(() => {
            return null;
        });
        postMock = Mock.ofInstance(() => {
            return null;
        });
        gotStub = {
            extend: extendMock.object,
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
        extendMock.verifyAll();
        postMock.verifyAll();
        getMock.verifyAll();
        getAgentsMock.verifyAll();
    });

    it.each([true, false])('Constructor sets request parameters when throwOnRequestFailure=%s', (throwOnRequestFailure) => {
        const defaultRequestOptions: ExtendOptions = {
            searchParams: {
                'api-version': apiVersion,
            },
            headers: {
                'Content-Type': 'application/json',
            },
            responseType: 'json',
            throwHttpErrors: throwOnRequestFailure,
            agent: agentsStub,
        };

        extendMock.reset();
        extendMock.setup((e) => e(defaultRequestOptions)).returns(() => gotStub);

        testSubject = new WebInsightsStorageClient(
            baseUrl,
            loggerMock.object,
            throwOnRequestFailure,
            apiVersion,
            gotStub,
            getAgentsMock.object,
            retryHelperMock.object,
            maxRetryCount,
            msecBetweenRetries,
        );
    });

    it('postWebsite sends POST request with expected properties', async () => {
        const website = ApiContracts.websiteWithRequiredProperties;
        const requestOptions = { json: website };
        const requestUrl = `${baseUrl}/websites`;

        setupRetryHelperMock();
        postMock
            .setup((req) => req(requestUrl, requestOptions))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.postWebsite(website);

        expect(actualResponse).toBe(response);
    });

    it('getWebsite sends GET request with expected properties', async () => {
        const websiteId = 'website id';
        const requestUrl = `${baseUrl}/websites/${websiteId}`;

        setupRetryHelperMock();
        getMock
            .setup((req) => req(requestUrl))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.getWebsite(websiteId);
        expect(actualResponse).toBe(response);
    });

    it('postPage sends POST request with expected properties', async () => {
        const pageUpdate: ApiContracts.PageUpdate = {
            pageId: 'page id',
            disabledScans: ['a11y'],
        };
        const requestOptions = { json: pageUpdate };
        const requestUrl = `${baseUrl}/pages`;

        setupRetryHelperMock();
        postMock
            .setup((req) => req(requestUrl, requestOptions))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.postPage(pageUpdate);

        expect(actualResponse).toBe(response);
    });

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup((r) => r.executeWithRetries(It.isAny(), It.isAny(), maxRetryCount, msecBetweenRetries))
            .returns(async (action: () => Promise<unknown>, errorHandler: (error: Error) => Promise<void>, maxAttempts: number) => {
                return action();
            })
            .verifiable();
    }
});
