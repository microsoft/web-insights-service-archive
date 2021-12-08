// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AuthenticationResult } from '@azure/msal-common';
import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { RetryHelper, System } from 'common';
import { Logger } from 'logger';

export type ConfidentialClientApplicationFactory = (config: Configuration) => ConfidentialClientApplication;
const defaultClientApplicationFactory = (config: Configuration) => new ConfidentialClientApplication(config);

export class WebInsightsAPICredential {
    private readonly app: ConfidentialClientApplication;

    private readonly tokenScope: string;

    constructor(
        clientId: string,
        clientSecret: string,
        authorityUrl: string,
        resourceClientId: string,
        private readonly logger: Logger,
        private readonly maxTokenAttempts: number = 5,
        private readonly msecBetweenRetries: number = 1000,
        private readonly retryHelper: RetryHelper<AuthenticationResult> = new RetryHelper(),
        clientApplicationFactory: ConfidentialClientApplicationFactory = defaultClientApplicationFactory,
    ) {
        this.tokenScope = `api://${resourceClientId}/.default`;
        const config: Configuration = {
            auth: {
                clientId: clientId,
                clientSecret: clientSecret,
                authority: authorityUrl,
            },
        };
        this.app = clientApplicationFactory(config);
    }

    public async getToken(): Promise<AuthenticationResult> {
        return this.retryHelper.executeWithRetries(
            () =>
                this.app.acquireTokenByClientCredential({
                    scopes: [this.tokenScope],
                }),
            async (error) => this.logger.logError(`Error while acquiring Azure AD client token. ${System.serializeError(error)}`),
            this.maxTokenAttempts,
            this.msecBetweenRetries,
        );
    }
}
