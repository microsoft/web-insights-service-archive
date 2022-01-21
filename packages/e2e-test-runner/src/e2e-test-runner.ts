// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger, Logger } from 'logger';
import { TestContainerFactory } from './functional-tests/test-container-factory';
import { TestContextData } from './functional-tests/test-context-data';
import { FinalizerTestGroup } from './functional-tests/test-groups/finalizer-test-group';
import { TestRunner } from './functional-tests/test-runner';
import { allTestScenarioFactories, TestScenarioDefinitionFactory } from './test-scenarios/test-scenario-definitions';
import { TestScenarioDriver } from './test-scenarios/test-scenario-driver';
import { TestScenarioDriverFactory } from './test-scenarios/test-scenario-driver-factory';

@injectable()
export class E2ETestRunner {
    constructor(
        @inject(ContextAwareLogger) private readonly logger: Logger,
        @inject(TestContainerFactory) private readonly testContainerFactory: TestContainerFactory,
        @inject(TestRunner) private readonly testRunner: TestRunner,
        @inject(TestScenarioDriverFactory) private readonly testScenarioDriverFactory: TestScenarioDriverFactory,
        private readonly testScenarioFactories: TestScenarioDefinitionFactory[] = allTestScenarioFactories,
    ) {}

    public async run(): Promise<void> {
        this.logger.logInfo('Beginning run of E2E test suite');

        const testScenarioDrivers = await this.createAllTestScenarioDrivers();

        await Promise.all(testScenarioDrivers.map((testScenarioDriver) => testScenarioDriver.executeTestScenario()));

        await this.finalizeTestRun();

        this.logger.logInfo('E2E test run completed');
    }

    private async createAllTestScenarioDrivers(): Promise<TestScenarioDriver[]> {
        const testScenarios = this.testScenarioFactories.map((testScenarioFactory) => testScenarioFactory());

        return Promise.all(testScenarios.map((scenario) => this.testScenarioDriverFactory.createTestScenarioDriver(scenario)));
    }

    private async finalizeTestRun(): Promise<void> {
        await this.testRunner.run(
            await this.testContainerFactory.createTestContainer(FinalizerTestGroup),
            { scenarioName: 'Finalizer' },
            {} as TestContextData,
        );
    }
}
