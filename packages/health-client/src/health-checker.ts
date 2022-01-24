// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration, System } from 'common';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import * as yargs from 'yargs';
import _ from 'lodash';
import { WebInsightsAPICredential, WebInsightsStorageClient } from 'storage-api-client';
import { DeploymentHealthChecker } from './deployment-health-checker';

type Argv = {
    clientId: string;
    clientSecret: string;
    resourceId: string;
    authorityUrl: string;
    waitTimeBeforeEvaluationInMinutes: string;
    evaluationIntervalInMinutes: string;
    releaseId: string;
    frontendDns: string;
};

const testTimeoutInMinutes = 75;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const argv: Argv = yargs.argv as any;

(async () => {
    const logger = new GlobalLogger([new ConsoleLoggerClient(new ServiceConfiguration(), console)], process);
    await logger.setup();

    const baseUrl = `https://${argv.frontendDns}/storage/api`;
    const serviceCredential = new WebInsightsAPICredential(argv.clientId, argv.clientSecret, argv.authorityUrl, argv.resourceId, logger);
    const client = new WebInsightsStorageClient(baseUrl, serviceCredential, logger);

    const waitTimeBeforeEvaluationInMinutes = parseInt(argv.waitTimeBeforeEvaluationInMinutes, 10);
    const evaluationIntervalInMinutes = parseInt(argv.evaluationIntervalInMinutes, 10);

    const deploymentHealthChecker = new DeploymentHealthChecker(logger, client);

    await deploymentHealthChecker.run(testTimeoutInMinutes, waitTimeBeforeEvaluationInMinutes, evaluationIntervalInMinutes, argv.releaseId);
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
