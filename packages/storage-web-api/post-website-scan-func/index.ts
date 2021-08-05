// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { processWebRequest } from '../src/process-web-request';
import { PostWebsiteScanController } from '../src/controllers/post-website-scan-controller';

export async function run(context: Context): Promise<void> {
    await processWebRequest(context, PostWebsiteScanController);
}
