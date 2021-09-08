// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DefaultAzureCredential } from '@azure/identity';
import 'reflect-metadata';

import { CredentialsProvider } from './credentials-provider';

describe(CredentialsProvider, () => {
    it('gets default credentials with MSI auth', async () => {
        const testSubject = new CredentialsProvider();

        const actualCredentials = await testSubject.getDefaultTokenCredential();

        expect(actualCredentials).toBeInstanceOf(DefaultAzureCredential);
    });
});
