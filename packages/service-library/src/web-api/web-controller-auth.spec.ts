// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AzureAdAuth } from 'azure-services';
import { IMock, Mock } from 'typemoq';
import { Context } from '@azure/functions';
import { WebControllerAuth } from './web-controller-auth';

const aclName = 'aclName';

let context: Context;
let webControllerAuth: WebControllerAuth;
let azureAdAuthMock: IMock<AzureAdAuth>;

describe(WebControllerAuth, () => {
    beforeEach(() => {
        azureAdAuthMock = Mock.ofType(AzureAdAuth);
        webControllerAuth = new WebControllerAuth(azureAdAuthMock.object);
    });

    afterEach(() => {
        azureAdAuthMock.verifyAll();
    });

    it('should reject if no HTTP Authorization header', async () => {
        context = <Context>(<unknown>{ res: {}, req: { headers: [] } });
        const actualResponse = await webControllerAuth.authorize(context, aclName);
        expect(actualResponse).toEqual(false);
        validateResponse();
    });

    it('should reject if HTTP Authorization header is not OAuth 2.0', async () => {
        context = <Context>(<unknown>{ res: {}, req: { headers: { authorization: 'token' } } });
        const actualResponse = await webControllerAuth.authorize(context, aclName);
        expect(actualResponse).toEqual(false);
        validateResponse();
    });

    it('should reject if token is empty', async () => {
        context = <Context>(<unknown>{ res: {}, req: { headers: { authorization: 'Bearer ' } } });
        const actualResponse = await webControllerAuth.authorize(context, aclName);
        expect(actualResponse).toEqual(false);
        validateResponse();
    });

    it('should reject if no ACL name', async () => {
        context = <Context>(<unknown>{ res: {}, req: { headers: { authorization: 'Bearer token' } } });
        const actualResponse = await webControllerAuth.authorize(context, '');
        expect(actualResponse).toEqual(false);
        validateResponse();
    });

    it('should reject if token provider has rejected', async () => {
        context = <Context>(<unknown>{ res: {}, req: { headers: { authorization: 'Bearer token' } } });
        azureAdAuthMock
            .setup((o) => o.authorize('token', aclName))
            .returns(() => Promise.resolve(false))
            .verifiable();
        const actualResponse = await webControllerAuth.authorize(context, aclName);
        expect(actualResponse).toEqual(false);
        validateResponse();
    });

    it('should accept if token provider has accepted', async () => {
        context = <Context>(<unknown>{ res: {}, req: { headers: { authorization: 'Bearer token' } } });
        azureAdAuthMock
            .setup((o) => o.authorize('token', aclName))
            .returns(() => Promise.resolve(true))
            .verifiable();
        const actualResponse = await webControllerAuth.authorize(context, aclName);
        expect(actualResponse).toEqual(true);
        expect(context.res).toEqual({});
    });
});

function validateResponse(): void {
    const expectedResponse = {
        status: 401,
        body: { error: { code: 'Unauthorized', codeId: 4014, message: 'You do not have permission to access this resource.' } },
    };
    expect(context.res).toEqual(expectedResponse);
}
