// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DefaultAzureCredential, TokenCredential } from '@azure/identity';
import { injectable } from 'inversify';

@injectable()
export class CredentialsProvider {
    public getDefaultTokenCredential(): TokenCredential {
        return new DefaultAzureCredential();
    }
}
