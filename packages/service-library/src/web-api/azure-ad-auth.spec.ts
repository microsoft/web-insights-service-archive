// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { AzureAdAuth } from './azure-ad-auth';

let azureAdAuth: AzureAdAuth;
let loggerMock: IMock<MockableLogger>;

describe(AzureAdAuth, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        azureAdAuth = new AzureAdAuth(loggerMock.object);
    });

    it('successfully validate JWT token', async () => {
        const token = ``;
        const actualResult = await azureAdAuth.authenticate(token);
        expect(actualResult).toEqual(true);
    });
});
