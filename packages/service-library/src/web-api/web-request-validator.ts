// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';

export interface WebRequestValidator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validateRequest(context: Context): Promise<boolean>;
}
