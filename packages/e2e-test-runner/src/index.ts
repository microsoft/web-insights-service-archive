// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { E2ETestRunnerEntryPoint } from './e2e-test-runner-entry-point';
import { setupE2ETestRunnerContainer } from './setup-e2e-test-runner-container';

(async () => {
    await new E2ETestRunnerEntryPoint(setupE2ETestRunnerContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
