// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import NodeCache from 'node-cache';
import { ContextAwareLogger } from 'logger';
import { System } from 'common';
import { isEmpty, values } from 'lodash';
import { Mutex } from 'async-mutex';
import { SecretProvider } from '../key-vault/secret-provider';
import { secretNames } from '../key-vault/secret-names';

export interface Acl {
    issuer: string;
    audience: string;
    publicKeysUrl: string;
    appIds: string[];
    valid?: boolean;
}

/**
 * Represents ACL entries object stored in a key vault secret as a JSON string.
 */
export interface AclEntries {
    /**
     * The application ID URI to grant access to
     */
    audience: string;

    /**
     * The list of application IDs granted access to audience
     */
    appIds: string[];
}

@injectable()
export class AclProvider {
    private static readonly cacheCheckPeriod = 300;

    private static readonly cacheExpirationTime = 600;

    constructor(
        @inject(SecretProvider) private readonly secretProvider: SecretProvider,
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
        private readonly aclCache: NodeCache = new NodeCache({ checkperiod: AclProvider.cacheCheckPeriod }),
        private readonly mutex: Mutex = new Mutex(),
    ) {}

    /**
     *
     * @param aclName The key vault secret name containing JSON string representing {@link AclEntries} ACL entries object.
     */
    public async getAcl(aclName: string): Promise<Acl> {
        const cachedAcl = this.aclCache.get<Acl>(aclName);
        if (cachedAcl !== undefined) {
            return cachedAcl;
        }

        return this.getAclExclusive(aclName);
    }

    private async getAclExclusive(aclName: string): Promise<Acl> {
        return this.mutex.runExclusive(async () => {
            const acl = await this.readAcl(aclName);
            if (acl.valid === true) {
                this.aclCache.set<Acl>(aclName, acl, AclProvider.cacheExpirationTime);
            }

            return acl;
        });
    }

    private async readAcl(aclName: string): Promise<Acl> {
        const issuer = await this.secretProvider.getSecret(secretNames.aclIssuer);
        const publicKeysUrl = await this.secretProvider.getSecret(secretNames.aclPublicKeysUrl);
        const aclEntries = await this.getAclEntries(aclName);

        const acl = {
            issuer,
            publicKeysUrl,
            audience: aclEntries?.audience,
            appIds: aclEntries?.appIds,
        };
        this.validateAcl(acl);

        return acl;
    }

    private async getAclEntries(aclName: string): Promise<AclEntries> {
        let aclEntries: AclEntries;

        try {
            const aclEntriesValue = await this.secretProvider.getSecret(aclName);
            aclEntries = JSON.parse(aclEntriesValue) as AclEntries;
        } catch (error) {
            this.logger.logError(`Unable to retrieve ACL entries for ${aclName} audience from a key vault.`, {
                error: System.serializeError(error),
            });
        }

        return aclEntries;
    }

    private validateAcl(acl: Acl): void {
        acl.valid = !values(acl).some(isEmpty);
    }
}
