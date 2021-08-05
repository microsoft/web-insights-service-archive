// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { processWebRequest } from '../src/process-web-request';
import { PostPageController } from '../src/controllers/post-page-controller';

export async function run(context: Context): Promise<void> {
    await processWebRequest(context, PostPageController);
}
