// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GetHealthReportController } from '../src/controllers/get-health-report-controller';
import { processWebRequest } from '../src/process-web-request';

export async function run(context: Context): Promise<void> {
    await processWebRequest(context, GetHealthReportController);
}
