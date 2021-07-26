// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ApiRequestValidator } from 'service-library';

@injectable()
export class GetWebsiteRequestValidator extends ApiRequestValidator {
    public static readonly apiVersions = ['1.0'];

    constructor() {
        super(GetWebsiteRequestValidator.apiVersions);
    }
}
