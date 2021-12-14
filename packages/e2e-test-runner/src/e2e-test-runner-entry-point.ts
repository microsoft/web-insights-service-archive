// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { E2ETestRunner } from './e2e-test-runner';

export class E2ETestRunnerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'e2eTestRunner' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async runCustomAction(container: Container, ...args: any[]): Promise<void> {
        const logger = container.get(ContextAwareLogger);
        await logger.setup();

        const runner = container.get(E2ETestRunner);
        await runner.run();
    }
}
