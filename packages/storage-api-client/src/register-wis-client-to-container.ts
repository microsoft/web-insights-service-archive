// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IoC } from 'common';
import { Container } from 'inversify';
import { SecretProvider, secretNames } from 'azure-services';
import { GlobalLogger } from 'logger';
import { WebInsightsServiceClientTypeNames } from './type-names';
import { WebInsightsAPICredential } from './web-insights-api-credential';
import { WebInsightsStorageClient } from '.';

export function registerWebInsightsStorageClientToContainer(container: Container): void {
    IoC.setupSingletonProvider<WebInsightsStorageClient>(
        WebInsightsServiceClientTypeNames.WebInsightsClientProvider,
        container,
        async (context) => {
            const secretProvider = context.container.get(SecretProvider);
            const clientId = await secretProvider.getSecret(secretNames.restApiClientId);
            const clientSecret = await secretProvider.getSecret(secretNames.restApiClientSecret);
            const resourceId = await secretProvider.getSecret(secretNames.restApiResourceId);
            const authorityUrl = await secretProvider.getSecret(secretNames.authorityUrl);
            const logger = context.container.get(GlobalLogger);

            const credential = new WebInsightsAPICredential(clientId, clientSecret, authorityUrl, resourceId, logger);

            return new WebInsightsStorageClient(process.env.WEB_API_BASE_URL, credential, logger);
        },
    );
}
