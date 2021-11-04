// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import NodeCache from 'node-cache';
import { IMock, Mock } from 'typemoq';
import { Mutex } from 'async-mutex';
import { SecretProvider } from '../key-vault/secret-provider';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { secretNames } from '../key-vault/secret-names';
import { AclProvider, Acl, AclEntries } from './acl-provider';

const aclName = 'aclName';
const acl: Acl = {
    issuer: 'issuer',
    audience: 'audience',
    publicKeysUrl: 'publicKeysUrl',
    appIds: ['appId-1'],
    valid: true,
};

describe(AclProvider, () => {
    let secretProviderMock: IMock<SecretProvider>;
    let loggerMock: IMock<MockableLogger>;
    let aclCacheMock: IMock<NodeCache>;
    let aclProvider: AclProvider;

    beforeEach(() => {
        secretProviderMock = Mock.ofType<SecretProvider>();
        loggerMock = Mock.ofType<MockableLogger>();
        aclCacheMock = Mock.ofType<NodeCache>();

        aclProvider = new AclProvider(secretProviderMock.object, loggerMock.object, aclCacheMock.object, new Mutex());
    });

    afterEach(() => {
        secretProviderMock.verifyAll();
        loggerMock.verifyAll();
        aclCacheMock.verifyAll();
    });

    it('get ACL from a cache', async () => {
        aclCacheMock
            .setup((o) => o.get<Acl>(aclName))
            .returns(() => acl)
            .verifiable();

        const actualAcl = await aclProvider.getAcl(aclName);

        expect(actualAcl).toEqual(acl);
    });

    it('read valid ACL from a key vault', async () => {
        aclCacheMock.setup((o) => o.set<Acl>(aclName, acl, 600)).verifiable();
        secretProviderMock
            .setup((o) => o.getSecret(secretNames.aclIssuer))
            .returns(() => Promise.resolve(acl.issuer))
            .verifiable();
        secretProviderMock
            .setup((o) => o.getSecret(secretNames.aclPublicKeysUrl))
            .returns(() => Promise.resolve(acl.publicKeysUrl))
            .verifiable();
        secretProviderMock
            .setup((o) => o.getSecret(aclName))
            .returns(() => Promise.resolve(JSON.stringify({ audience: acl.audience, appIds: acl.appIds } as AclEntries)))
            .verifiable();
        const actualAcl = await aclProvider.getAcl(aclName);

        expect(actualAcl).toEqual(acl);
    });

    it('read invalid ACL from a key vault', async () => {
        secretProviderMock
            .setup((o) => o.getSecret(secretNames.aclIssuer))
            .returns(() => Promise.resolve(acl.issuer))
            .verifiable();
        secretProviderMock
            .setup((o) => o.getSecret(secretNames.aclPublicKeysUrl))
            .returns(() => Promise.resolve(acl.publicKeysUrl))
            .verifiable();
        secretProviderMock
            .setup((o) => o.getSecret(aclName))
            .returns(() => Promise.resolve(JSON.stringify({} as AclEntries)))
            .verifiable();
        const expectedAcl: Acl = {
            issuer: 'issuer',
            audience: undefined,
            publicKeysUrl: 'publicKeysUrl',
            appIds: undefined,
            valid: false,
        };

        const actualAcl = await aclProvider.getAcl(aclName);

        expect(actualAcl).toEqual(expectedAcl);
    });

    it('failure to read ACL from a key vault', async () => {
        secretProviderMock
            .setup((o) => o.getSecret(secretNames.aclIssuer))
            .returns(() => Promise.resolve(acl.issuer))
            .verifiable();
        secretProviderMock
            .setup((o) => o.getSecret(secretNames.aclPublicKeysUrl))
            .returns(() => Promise.resolve(acl.publicKeysUrl))
            .verifiable();
        secretProviderMock
            .setup((o) => o.getSecret(aclName))
            .returns(() => Promise.reject('Secret key not found'))
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logError(`Unable to retrieve ACL entries for ${aclName} audience from a key vault.`, { error: "'Secret key not found'" }),
            )
            .verifiable();
        const expectedAcl: Acl = {
            issuer: 'issuer',
            audience: undefined,
            publicKeysUrl: 'publicKeysUrl',
            appIds: undefined,
            valid: false,
        };

        const actualAcl = await aclProvider.getAcl(aclName);

        expect(actualAcl).toEqual(expectedAcl);
    });
});
