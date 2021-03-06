// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { Agents, ExtendOptions, Got, Options } from 'got';
import { IMock, It, Mock } from 'typemoq';
import { RetryHelper } from 'common';
import { Logger } from 'logger';
import { AuthenticationResult } from '@azure/msal-common';
import { WebInsightsStorageClient } from './web-insights-storage-client';
import { WebInsightsAPICredential } from './web-insights-api-credential';

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
    let credentialMock: IMock<WebInsightsAPICredential>;
    let retryHelperMock: IMock<RetryHelper<unknown>>;
    let loggerMock: IMock<Logger>;
    let getAgentsMock: IMock<() => Agents>;
    let response: unknown;
    const agentsStub = {};
    const token = {
        tokenType: 'Bearer',
        accessToken: 'access token',
    } as AuthenticationResult;

    let testSubject: WebInsightsStorageClient;

    beforeEach(() => {
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
        credentialMock = Mock.ofType<WebInsightsAPICredential>();

        testSubject = new WebInsightsStorageClient(
            baseUrl,
            credentialMock.object,
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
        credentialMock.verifyAll();
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
            credentialMock.object,
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
        setupSignRequest();
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
        setupSignRequest();
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
        setupSignRequest();
        postMock
            .setup((req) => req(requestUrl, requestOptions))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.postPage(pageUpdate);

        expect(actualResponse).toBe(response);
    });

    it('postWebsiteScan sends POST request with expected properties', async () => {
        const websiteScan: ApiContracts.WebsiteScanRequest = {
            websiteId: 'website id',
            scanType: 'a11y',
        };
        const requestOptions = { json: websiteScan };
        const requestUrl = `${baseUrl}/websites/scans`;

        setupRetryHelperMock();
        setupSignRequest();
        postMock
            .setup((req) => req(requestUrl, requestOptions))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.postWebsiteScan(websiteScan);

        expect(actualResponse).toBe(response);
    });

    it('getWebsiteScan sends GET request with specified website id', async () => {
        const websiteId = 'website id';
        const scanType = 'a11y';
        const websiteScanId = 'website scan id';
        const requestUrl = `${baseUrl}/websites/${websiteId}/scans/${scanType}/${websiteScanId}`;

        setupRetryHelperMock();
        setupSignRequest();
        getMock
            .setup((req) => req(requestUrl))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.getWebsiteScan(websiteId, scanType, websiteScanId);
        expect(actualResponse).toBe(response);
    });

    it('getLatestWebsiteScan sends GET request with expected url', async () => {
        const websiteId = 'website id';
        const scanType = 'a11y';
        const requestUrl = `${baseUrl}/websites/${websiteId}/scans/${scanType}/latest`;

        setupRetryHelperMock();
        setupSignRequest();
        getMock
            .setup((req) => req(requestUrl))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.getLatestWebsiteScan(websiteId, scanType);
        expect(actualResponse).toBe(response);
    });

    it('pingHealth sends GET request with expected url', async () => {
        const requestUrl = `${baseUrl}/health`;

        setupRetryHelperMock();
        setupSignRequest();
        getMock
            .setup((g) => g(requestUrl))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.pingHealth();
        expect(actualResponse).toBe(response);
    });

    it('getHealthReport with releaseId sends GET request with expected url', async () => {
        const releaseId = 'release id';
        const requestUrl = `${baseUrl}/health/release/${releaseId}`;

        setupRetryHelperMock();
        setupSignRequest();
        getMock
            .setup((g) => g(requestUrl))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.getHealthReport(releaseId);
        expect(actualResponse).toBe(response);
    });

    it('getHealthReport with releaseId sends GET request with expected url', async () => {
        const requestUrl = `${baseUrl}/health/release`;

        setupRetryHelperMock();
        setupSignRequest();
        getMock
            .setup((g) => g(requestUrl))
            .returns(async () => response)
            .verifiable();

        const actualResponse = await testSubject.getHealthReport();
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

    function setupSignRequest(): void {
        credentialMock
            .setup((c) => c.getToken())
            .returns(async () => token)
            .verifiable();
        const expectedOptions: ExtendOptions = {
            headers: {
                authorization: `${token.tokenType} ${token.accessToken}`,
            },
        };
        extendMock
            .setup((e) => e(expectedOptions))
            .returns(() => gotStub)
            .verifiable();
    }
});
