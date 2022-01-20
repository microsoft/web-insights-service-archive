// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { setupE2ETestRunnerContainer } from './setup-e2e-test-runner-container';
import { E2ETestRunner } from './e2e-test-runner';
import { E2ETestRunnerTypeNames, TestRunIdProvider } from './type-names';

describe(setupE2ETestRunnerContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupE2ETestRunnerContainer();

        expect(container.get(E2ETestRunner)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupE2ETestRunnerContainer();

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });

    it('testRunIdProvider is a singleton provider', async () => {
        const container = setupE2ETestRunnerContainer();

        const guid1 = await container.get<TestRunIdProvider>(E2ETestRunnerTypeNames.testRunIdProvider)();
        const guid2 = await container.get<TestRunIdProvider>(E2ETestRunnerTypeNames.testRunIdProvider)();

        expect(guid1).toEqual(guid2);
    });

    it('testRunIdProvider creates a unique test run id per container', async () => {
        const container1 = setupE2ETestRunnerContainer();
        const container2 = setupE2ETestRunnerContainer();

        const guid1 = await container1.get<TestRunIdProvider>(E2ETestRunnerTypeNames.testRunIdProvider)();
        const guid2 = await container2.get<TestRunIdProvider>(E2ETestRunnerTypeNames.testRunIdProvider)();

        expect(guid1).not.toEqual(guid2);
    });
});
