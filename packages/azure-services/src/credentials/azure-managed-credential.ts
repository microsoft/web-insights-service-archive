// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { AccessToken } from '@azure/core-auth';
import { TokenCredential, GetTokenOptions } from '@azure/identity';
import got, { Got, Options } from 'got';
import { ResponseWithBodyType } from 'common';

export interface Token {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_on: number;
    not_before: number;
    resource: string;
    token_type: string;
}

@injectable()
export class AzureManagedCredential implements TokenCredential {
    private static readonly imdsEndpoint =
        'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2019-08-01&resource=https%3A%2F%2Fmanagement.azure.com%2F&principal_id=';

    private readonly httpClient: Got;

    private readonly options: Options = {
        headers: {
            Metadata: 'true',
        },
    };

    constructor(httpClientBase: Got = got) {
        this.httpClient = httpClientBase.extend({
            ...this.options,
        });
    }

    public async getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken> {
        const token = await this.getMsiToken();

        return { token: token.body.access_token, expiresOnTimestamp: token.body.expires_on };
    }

    private async getMsiToken(): Promise<ResponseWithBodyType<Token>> {
        const response = await this.httpClient.get(`${AzureManagedCredential.imdsEndpoint}${process.env.AZURE_PRINCIPAL_ID}`);

        return response as unknown as ResponseWithBodyType<Token>;
    }
}
