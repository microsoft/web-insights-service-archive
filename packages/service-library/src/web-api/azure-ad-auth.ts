// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { verify, VerifyOptions } from 'azure-ad-verify-token';

// References:
//  Register an application with the Microsoft identity platform
//  https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
//
//  Microsoft identity platform and the OAuth 2.0 client credentials flow
//  https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow

@injectable()
export class AzureAdAuth {
    constructor(@inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger) {}

    public async authenticate(token: string): Promise<boolean> {
        const options: VerifyOptions = {
            jwksUri: 'https://login.microsoftonline.com/common/discovery/keys',
            issuer: 'https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/',
            audience: 'https://webinsights.microsoft.com/api',
        };

        const jwt = (await verify(token, options)) as string;
        this.logger.logInfo(jwt);

        return true;
    }
}
