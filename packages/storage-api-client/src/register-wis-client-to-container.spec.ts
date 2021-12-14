// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { secretNames, SecretProvider } from 'azure-services';
import { Container } from 'inversify';
import { GlobalLogger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { registerWebInsightsStorageClientToContainer } from './register-wis-client-to-container';
import { WebInsightsClientProvider, WebInsightsServiceClientTypeNames } from './type-names';
import { WebInsightsStorageClient } from '.';

describe(registerWebInsightsStorageClientToContainer, () => {
    const clientId = 'client id';
    const clientSecret = 'client secret';
    const resourceId = 'resource id';
    const authorityUrl = 'authority url';

    let loggerMock: IMock<GlobalLogger>;
    let secretProviderMock: IMock<SecretProvider>;
    let container: Container;

    beforeEach(() => {
        secretProviderMock = Mock.ofType(SecretProvider);
        loggerMock = Mock.ofType(GlobalLogger);
        container = new Container({ autoBindInjectable: true });
    });

    it('registers valid WebInsightsStorageClient', async () => {
        container.bind(SecretProvider).toConstantValue(secretProviderMock.object);
        container.bind(GlobalLogger).toDynamicValue(() => loggerMock.object);

        secretProviderMock.setup((s) => s.getSecret(secretNames.restApiClientId)).returns(async () => clientId);
        secretProviderMock.setup((s) => s.getSecret(secretNames.restApiResourceId)).returns(async () => resourceId);
        secretProviderMock.setup((s) => s.getSecret(secretNames.restApiClientSecret)).returns(async () => clientSecret);
        secretProviderMock.setup((s) => s.getSecret(secretNames.authorityUrl)).returns(async () => authorityUrl);

        registerWebInsightsStorageClientToContainer(container);

        const webInsightsClientProvider = container.get<WebInsightsClientProvider>(
            WebInsightsServiceClientTypeNames.WebInsightsClientProvider,
        );

        expect(webInsightsClientProvider).toBeDefined();

        const webInsightsClient = await webInsightsClientProvider();

        expect(webInsightsClient).toBeInstanceOf(WebInsightsStorageClient);
    });
});
