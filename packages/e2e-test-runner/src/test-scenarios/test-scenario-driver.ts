// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Logger } from 'logger';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestPhaseRunner } from './test-phase-runner';
import { TestScenarioDefinition } from './test-scenario-definitions';
import { TestScenarioSetupHandler } from './test-scenario-setup-handler';

export class TestScenarioDriver {
    protected testContextData: TestContextData;

    constructor(
        private readonly testScenarioDefinition: TestScenarioDefinition,
        private readonly logger: Logger,
        private readonly testScenarioSetupHandler: TestScenarioSetupHandler,
        private readonly testPhaseRunner: TestPhaseRunner,
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

        await this.testPhaseRunner.runTestPhaseForScenario('beforeScan', this.testScenarioDefinition, this.testContextData);
    }
}
