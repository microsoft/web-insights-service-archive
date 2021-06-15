// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GetWebsiteController } from '../src/controllers/get-website-controller';
import { processWebRequest } from '../src/process-web-request';

export async function run(context: Context): Promise<void> {
    await processWebRequest(context, GetWebsiteController);
}
