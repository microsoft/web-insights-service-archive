// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { TestContainerFactory } from '../functional-tests/test-container-factory';
import { TestRunner } from '../functional-tests/test-runner';
import { E2ETestRunnerTypeNames, TestRunIdProvider } from '../type-names';
import { TestScanHandler } from './test-scan-handler';
import { TestScenarioDefinition } from './test-scenario-definitions';
import { TestScenarioDriver } from './test-scenario-driver';
import { TestScenarioSetupHandler } from './test-scenario-setup-handler';

@injectable()
export class TestScenarioDriverFactory {
    constructor(
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
        @inject(TestScenarioSetupHandler) private readonly setupHandler: TestScenarioSetupHandler,
        @inject(TestContainerFactory) private readonly testContainerFactory: TestContainerFactory,
        @inject(TestRunner) private readonly testRunner: TestRunner,
        @inject(TestScanHandler) private readonly testScanHandler: TestScanHandler,
        @inject(E2ETestRunnerTypeNames.testRunIdProvider) private readonly testRunIdProvider: TestRunIdProvider,
    ) {}

    public async createTestScenarioDriver(testScenario: TestScenarioDefinition): Promise<TestScenarioDriver> {
        const testRunId = await this.testRunIdProvider();

        return new TestScenarioDriver(
            testScenario,
            this.logger,
            this.setupHandler,
            this.testContainerFactory,
            this.testRunner,
            this.testScanHandler,
            testRunId,
        );
    }
}
