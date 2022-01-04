// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger, Logger } from 'logger';
import { TestPhaseRunner } from './test-scenarios/test-phase-runner';
import {
    allTestScenarioFactories,
    TestScenarioDefinition,
    TestScenarioDefinitionFactory,
} from './test-scenarios/test-scenario-definitions';
import { TestScenarioDriver } from './test-scenarios/test-scenario-driver';
import { TestScenarioSetupHandler } from './test-scenarios/test-scenario-setup-handler';

const testScenarioDriverFactory = (
    scenario: TestScenarioDefinition,
    logger: Logger,
    setupHandler: TestScenarioSetupHandler,
    testPhaseRunner: TestPhaseRunner,
) => new TestScenarioDriver(scenario, logger, setupHandler, testPhaseRunner);

export type TestScenarioDriverFactory = typeof testScenarioDriverFactory;

@injectable()
export class E2ETestRunner {
    constructor(
        @inject(ContextAwareLogger) private readonly logger: Logger,
        @inject(TestScenarioSetupHandler) private readonly testScenarioSetupHandler: TestScenarioSetupHandler,
        @inject(TestPhaseRunner) private readonly testPhaseRunner: TestPhaseRunner,
        private readonly testScenarioFactories: TestScenarioDefinitionFactory[] = allTestScenarioFactories,
        private readonly createTestScenarioDriver: typeof testScenarioDriverFactory = testScenarioDriverFactory,
    ) {}

    public async run(): Promise<void> {
        this.logger.logInfo('Beginning run of E2E test suite');

        const testScenarioDrivers = this.createAllTestScenarioDrivers();

        await Promise.all(testScenarioDrivers.map((testScenarioDriver) => testScenarioDriver.executeTestScenario()));

        await this.testPhaseRunner.finalizeTestRun();

        this.logger.logInfo('E2E test run completed');
    }

    private createAllTestScenarioDrivers(): TestScenarioDriver[] {
        const testScenarios = this.testScenarioFactories.map((factory) => factory());

        return testScenarios.map((scenario) =>
            this.createTestScenarioDriver(scenario, this.logger, this.testScenarioSetupHandler, this.testPhaseRunner),
        );
    }
}
