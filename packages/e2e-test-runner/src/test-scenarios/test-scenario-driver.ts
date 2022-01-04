// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import _ from 'lodash';
import { Logger } from 'logger';
import { TestContainerFactory } from '../functional-tests/test-container-factory';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestRunner } from '../functional-tests/test-runner';
import { TestPhases, TestScenarioDefinition } from './test-scenario-definitions';
import { TestScenarioSetupHandler } from './test-scenario-setup-handler';

export class TestScenarioDriver {
    protected testContextData: TestContextData;

    constructor(
        private readonly testScenarioDefinition: TestScenarioDefinition,
        private readonly logger: Logger,
        private readonly testScenarioSetupHandler: TestScenarioSetupHandler,
        private readonly testContainerFactory: TestContainerFactory,
        private readonly testRunner: TestRunner,
    ) {}

    public async executeTestScenario(): Promise<void> {
        try {
            this.testContextData = await this.testScenarioSetupHandler.setUpTestScenario(this.testScenarioDefinition);
        } catch (e) {
            this.logger.logError('Failed to set up test scenario.', {
                testScenarioName: this.testScenarioDefinition.readableName,
                error: JSON.stringify(e),
            });

            return;
        }

        await this.runTestPhase('beforeScan');
    }

    private async runTestPhase(phaseName: keyof TestPhases): Promise<void> {
        const testContainerClasses = this.testScenarioDefinition.testPhases[phaseName];
        if (_.isEmpty(testContainerClasses)) {
            return;
        }
        const testContainers = await Promise.all(
            testContainerClasses.map((testContainerClass) => this.testContainerFactory.createTestContainer(testContainerClass)),
        );

        await this.testRunner.runAll(testContainers, { scenarioName: this.testScenarioDefinition.readableName }, this.testContextData);
    }
}
