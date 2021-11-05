// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { verify, VerifyOptions } from 'azure-ad-verify-token';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { AzureAdAuth, TokenPayload } from './azure-ad-auth';
import { AclProvider, Acl } from './acl-provider';

const aclName = 'aclName';
const token = `token`;

let acl: Acl;
let options: VerifyOptions;
let azureAdAuth: AzureAdAuth;
let aclProviderMock: IMock<AclProvider>;
let loggerMock: IMock<MockableLogger>;
let verifyMock: IMock<typeof verify>;

describe(AzureAdAuth, () => {
    beforeEach(() => {
        acl = {
            issuer: 'issuer',
            audience: 'audience',
            publicKeysUrl: 'publicKeysUrl',
            appIds: ['appId-1'],
            valid: true,
        };
        options = {
            jwksUri: acl.publicKeysUrl,
            issuer: acl.issuer,
            audience: acl.audience,
        };

        aclProviderMock = Mock.ofType(AclProvider);
        loggerMock = Mock.ofType(MockableLogger);
        verifyMock = Mock.ofInstance(verify);
        aclProviderMock
            .setup((o) => o.getAcl(aclName))
            .returns(() => Promise.resolve(acl))
            .verifiable();

        azureAdAuth = new AzureAdAuth(aclProviderMock.object, loggerMock.object, verifyMock.object);
    });

    afterEach(() => {
        aclProviderMock.verifyAll();
        loggerMock.verifyAll();
        verifyMock.verifyAll();
    });

    it('grant access', async () => {
        const jwt: TokenPayload = {
            aud: acl.audience,
            appid: acl.appIds[0],
        };
        verifyMock
            .setup((o) => o(token, options))
            .returns(() => Promise.resolve(jwt))
            .verifiable();
        loggerMock.setup((o) => o.logInfo(`Access granted.`, { aclName, audience: jwt.aud, appId: jwt.appid })).verifiable();

        const actualResult = await azureAdAuth.authenticate(token, aclName);
        expect(actualResult).toEqual(true);
    });

    it('deny access for invalid ACL', async () => {
        aclProviderMock.reset();
        acl.valid = false;
        aclProviderMock
            .setup((o) => o.getAcl(aclName))
            .returns(() => Promise.resolve(acl))
            .verifiable();
        loggerMock.setup((o) => o.logError(`Access denied. Invalid ACL configuration.`, { aclName })).verifiable();

        const actualResult = await azureAdAuth.authenticate(token, aclName);
        expect(actualResult).toEqual(false);
    });

    it('deny access for invalid app id', async () => {
        const jwt: TokenPayload = {
            aud: acl.audience,
            appid: 'appId-2',
        };
        verifyMock
            .setup((o) => o(token, options))
            .returns(() => Promise.resolve(jwt))
            .verifiable();
        loggerMock.setup((o) => o.logWarn(`Access denied.`, { aclName, audience: jwt.aud, appId: jwt.appid })).verifiable();

        const actualResult = await azureAdAuth.authenticate(token, aclName);
        expect(actualResult).toEqual(false);
    });

    it('deny access for invalid audience', async () => {
        const jwt: TokenPayload = {
            aud: 'audience-other',
            appid: acl.appIds[0],
        };
        verifyMock
            .setup((o) => o(token, options))
            .returns(() => Promise.resolve(jwt))
            .verifiable();
        loggerMock.setup((o) => o.logWarn(`Access denied.`, { aclName, audience: jwt.aud, appId: jwt.appid })).verifiable();

        const actualResult = await azureAdAuth.authenticate(token, aclName);
        expect(actualResult).toEqual(false);
    });

    it('deny access on error', async () => {
        verifyMock
            .setup((o) => o(token, options))
            .returns(() => Promise.reject('Invalid token'))
            .verifiable();
        loggerMock.setup((o) => o.logError(`Access denied. Token validation failure.`, { aclName, error: "'Invalid token'" })).verifiable();

        const actualResult = await azureAdAuth.authenticate(token, aclName);
        expect(actualResult).toEqual(false);
    });
});
