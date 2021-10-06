// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Got, CancelableRequest, Response } from 'got';
import NodeCache from 'node-cache';
import { IMock, Mock, Times } from 'typemoq';
import { AzureManagedCredential } from './azure-managed-credential';

describe(AzureManagedCredential, () => {
    const scopes = 'https://vault.azure.net/default';
    const requestUrl =
        'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2019-08-01&resource=https://vault.azure.net&principal_id=sp-id';
    const getTokenOptions = {
        requestOptions: {
            timeout: 30,
        },
    };
    const httpClientOptions = {
        headers: {
            Metadata: 'true',
        },
    };

    const expires_in = 85496;
    const accessToken = { token: 'eyJ0e_3g', expiresOnTimestamp: 1633500000 };
    const imdsTokenString = `{"access_token":"${accessToken.token}","refresh_token":"","expires_in":${expires_in},"expires_on":${accessToken.expiresOnTimestamp},"not_before":${accessToken.expiresOnTimestamp},"resource":"https://vault.azure.net","token_type":"Bearer"}`;

    let httpClientBaseMock: IMock<Got>;
    let tokenCacheMock: IMock<NodeCache>;
    let azureManagedCredential: AzureManagedCredential;

    beforeEach(() => {
        httpClientBaseMock = Mock.ofType<Got>();
        tokenCacheMock = Mock.ofType<NodeCache>();
        process.env.AZURE_PRINCIPAL_ID = 'sp-id';
        httpClientBaseMock
            .setup((o) => o.extend({ ...httpClientOptions }))
            .returns(() => httpClientBaseMock.object)
            .verifiable();

        azureManagedCredential = new AzureManagedCredential(httpClientBaseMock.object, tokenCacheMock.object);
    });

    afterEach(() => {
        httpClientBaseMock.verifyAll();
        tokenCacheMock.verifyAll();
    });

    it('get msi token from a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(requestUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable();
        const response = { body: imdsTokenString } as unknown as CancelableRequest<Response<string>>;
        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable();

        const actualAccessToken = await azureManagedCredential.getToken(scopes, getTokenOptions);

        expect(actualAccessToken).toEqual(accessToken);
    });

    it('get msi token from a cache', async () => {
        tokenCacheMock
            .setup((o) => o.get(requestUrl))
            .returns(() => JSON.parse(imdsTokenString))
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable(Times.never());
        const response = { body: imdsTokenString } as unknown as CancelableRequest<Response<string>>;
        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable(Times.never());

        const actualAccessToken = await azureManagedCredential.getToken(scopes, getTokenOptions);

        expect(actualAccessToken).toEqual(accessToken);
    });

    it('failed to get msi token from a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(requestUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable(Times.never());
        const response = {} as unknown as CancelableRequest<Response<string>>;
        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable();

        await expect(azureManagedCredential.getToken(scopes, getTokenOptions)).rejects.toThrow();
    });
});
