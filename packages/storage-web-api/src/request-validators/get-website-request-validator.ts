// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ApiRequestValidator } from 'service-library';

@injectable()
export class GetWebsiteRequestValidator extends ApiRequestValidator {
    protected readonly apiVersions = ['1.0'];
}