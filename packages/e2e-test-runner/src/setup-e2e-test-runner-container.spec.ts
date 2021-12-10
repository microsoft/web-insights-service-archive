// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { setupE2ETestRunnerContainer } from './setup-e2e-test-runner-container';
import { E2ETestRunner } from './e2e-test-runner';

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
});
