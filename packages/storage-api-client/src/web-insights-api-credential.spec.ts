// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { RetryHelper } from 'common';
import { IMock, It, Mock } from 'typemoq';
import { AuthenticationResult } from '@azure/msal-common';
import { ClientCredentialRequest, ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { GlobalLogger } from 'logger';
import { ConfidentialClientApplicationFactory, WebInsightsAPICredential } from './web-insights-api-credential';

describe(WebInsightsAPICredential, () => {
    const clientId = 'client id';
    const clientSecret = 'client secret';
    const resourceClientId = 'resource id';
    const authUrl = 'auth url';
    const maxTokenAttempts = 3;
    const msecBetweenRetries = 10;
    const expectedClientAppOptions: Configuration = {
        auth: {
            clientId: clientId,
            clientSecret: clientSecret,
            authority: authUrl,
        },
    };
    const error = new Error('Test error');

    let loggerMock: IMock<GlobalLogger>;
    let retryHelperMock: IMock<RetryHelper<AuthenticationResult>>;
    let clientAppMock: IMock<ConfidentialClientApplication>;
    let clientAppFactoryMock: IMock<ConfidentialClientApplicationFactory>;

    let testSubject: WebInsightsAPICredential;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        retryHelperMock = Mock.ofType<RetryHelper<AuthenticationResult>>();
        clientAppMock = Mock.ofType<ConfidentialClientApplication>();
        clientAppFactoryMock = Mock.ofType<ConfidentialClientApplicationFactory>();

        clientAppFactoryMock.setup((f) => f(expectedClientAppOptions)).returns(() => clientAppMock.object);

        testSubject = new WebInsightsAPICredential(
            clientId,
            clientSecret,
            authUrl,
            resourceClientId,
            loggerMock.object,
            maxTokenAttempts,
            msecBetweenRetries,
            retryHelperMock.object,
            clientAppFactoryMock.object,
        );
    });

    afterEach(() => {
        clientAppMock.verifyAll();
        loggerMock.verifyAll();
        retryHelperMock.verifyAll();
    });

    it('Logs and throws error if token request throws', () => {
        clientAppMock.setup((c) => c.acquireTokenByClientCredential(It.isAny())).throws(error);
        setupRetryHelperMock(false);
        loggerMock.setup((l) => l.logError(It.isAny(), It.isAny())).verifiable();

        expect(testSubject.getToken()).rejects.toThrow(error);
    });

    it('Gets token with expected options', async () => {
        const expectedResourceUri = `api://${resourceClientId}/.default`;
        const expectedClientRequest: ClientCredentialRequest = {
            scopes: [expectedResourceUri],
        };
        const accessToken = 'access token';
        const authResult = {
            tokenType: 'Bearer',
            accessToken: accessToken,
        } as AuthenticationResult;

        clientAppMock
            .setup((c) => c.acquireTokenByClientCredential(expectedClientRequest))
            .returns(async () => authResult)
            .verifiable();
        setupRetryHelperMock(true);

        const tokenResult = await testSubject.getToken();

        expect(tokenResult).toEqual(authResult);
    });

    function setupRetryHelperMock(shouldSucceed: boolean): void {
        retryHelperMock
            .setup((r) => r.executeWithRetries(It.isAny(), It.isAny(), maxTokenAttempts, msecBetweenRetries))
            .returns(
                async (action: () => Promise<AuthenticationResult>, errorHandler: (err: Error) => Promise<void>, maxAttempts: number) => {
                    if (shouldSucceed) {
                        return action();
                    } else {
                        await errorHandler(error);
                        throw error;
                    }
                },
            )
            .verifiable();
    }
});
