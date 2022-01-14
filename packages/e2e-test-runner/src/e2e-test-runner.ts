// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger, Logger } from 'logger';
import { TestContainerFactory } from './functional-tests/test-container-factory';
import { TestContextData } from './functional-tests/test-context-data';
import { FinalizerTestGroup } from './functional-tests/test-groups/finalizer-test-group';
import { TestRunner } from './functional-tests/test-runner';
import { TestScanHandler } from './test-scenarios/test-scan-handler';
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
    testContainerFactory: TestContainerFactory,
    testRunner: TestRunner,
    testScanHandler: TestScanHandler,
) => new TestScenarioDriver(scenario, logger, setupHandler, testContainerFactory, testRunner, testScanHandler);

export type TestScenarioDriverFactory = typeof testScenarioDriverFactory;

@injectable()
export class E2ETestRunner {
    constructor(
        @inject(ContextAwareLogger) private readonly logger: Logger,
        @inject(TestScenarioSetupHandler) private readonly testScenarioSetupHandler: TestScenarioSetupHandler,
        @inject(TestContainerFactory) private readonly testContainerFactory: TestContainerFactory,
        @inject(TestRunner) private readonly testRunner: TestRunner,
        @inject(TestScanHandler)
        private readonly testScanHandler: TestScanHandler,
        private readonly testScenarioFactories: TestScenarioDefinitionFactory[] = allTestScenarioFactories,
        private readonly createTestScenarioDriver: typeof testScenarioDriverFactory = testScenarioDriverFactory,
    ) {}

    public async run(): Promise<void> {
        this.logger.logInfo('Beginning run of E2E test suite');

        const testScenarioDrivers = await this.createAllTestScenarioDrivers();

        await Promise.all(testScenarioDrivers.map((testScenarioDriver) => testScenarioDriver.executeTestScenario()));

        await this.finalizeTestRun();

        this.logger.logInfo('E2E test run completed');
    }

    private createAllTestScenarioDrivers(): TestScenarioDriver[] {
        const testScenarios = this.testScenarioFactories.map((testScenarioFactory) => testScenarioFactory());

        return testScenarios.map((scenario) =>
            this.createTestScenarioDriver(
                scenario,
                this.logger,
                this.testScenarioSetupHandler,
                this.testContainerFactory,
                this.testRunner,
                this.testScanHandler,
            ),
        );
    }

    private async finalizeTestRun(): Promise<void> {
        await this.testRunner.run(
            await this.testContainerFactory.createTestContainer(FinalizerTestGroup),
            { scenarioName: 'Finalizer' },
            {} as TestContextData,
        );
    }
}
