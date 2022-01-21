// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

@injectable()
export class WebApiConfig {
    public readonly releaseId: string = process.env.RELEASE_VERSION;
}
