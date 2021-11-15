// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { verify, VerifyOptions } from 'azure-ad-verify-token';
import { System } from 'common';
import { includes, isEmpty } from 'lodash';
import { AclProvider } from './acl-provider';

// References:
//  Microsoft identity platform and the OAuth 2.0 client credentials flow
//  https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow

export interface TokenPayload {
    aud: string;
    appid: string;
}

@injectable()
export class AzureAdAuth {
    constructor(
        @inject(AclProvider) protected readonly aclProvider: AclProvider,
        @inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger,
        private readonly verifyToken: typeof verify = verify,
    ) {}

    public async authorize(token: string, aclName: string): Promise<boolean> {
        const acl = await this.aclProvider.getAcl(aclName);
        if (acl?.valid !== true) {
            this.logger.logError(`Access denied. Invalid ACL configuration.`, { aclName });

            return false;
        }

        const options: VerifyOptions = {
            jwksUri: acl.publicKeysUrl,
            issuer: acl.issuer,
            audience: acl.audience,
        };

        try {
            const payload = (await this.verifyToken(token, options)) as TokenPayload;

            if (!isEmpty(payload.aud) && !isEmpty(payload.appid) && payload.aud === acl.audience && includes(acl.appIds, payload.appid)) {
                this.logger.logInfo(`Access granted.`, { aclName, audience: payload.aud, appId: payload.appid });

                return true;
            } else {
                this.logger.logWarn(`Access denied.`, { aclName, audience: payload.aud, appId: payload.appid });
            }
        } catch (error) {
            this.logger.logError(`Access denied. Token validation failure.`, {
                aclName,
                error: System.serializeError(error),
            });
        }

        return false;
    }
}
