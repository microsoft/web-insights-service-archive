// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { WebInsightsStorageClient } from 'storage-api-client';
import _ from 'lodash';
import { TestEnvironment } from '../functional-tests/common-types';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestRunMetadata, TestRunner } from '../functional-tests/test-runner';
import { WebApiConfig } from '../web-api-config';
import { FinalizerTestGroup } from '../functional-tests/test-groups/finalizer-test-group';
import { TestPhases, TestScenarioDefinition } from './test-scenario-definitions';

@injectable()
export class TestPhaseRunner {
    private readonly runId: string;

    constructor(
        @inject(TestRunner) private readonly testRunner: TestRunner,
        @inject(WebInsightsStorageClient) private readonly webInsightsClient: WebInsightsStorageClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(WebApiConfig) private readonly webApiConfig: WebApiConfig,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {
        this.runId = guidGenerator.createGuid();
    }

    public async runTestPhaseForScenario(
        testPhase: keyof TestPhases,
        testScenario: TestScenarioDefinition,
        testContextData: TestContextData,
    ): Promise<void> {
        const testContainerConstructors = testScenario.testPhases[testPhase];
        if (_.isEmpty(testContainerConstructors)) {
            return;
        }
        const testContainers = testContainerConstructors.map(
            (TestContainerType) => new TestContainerType(this.webInsightsClient, this.guidGenerator),
        );

        const testMetadata = await this.getTestMetadata(testScenario.readableName, testContextData);

        await this.testRunner.runAll(testContainers, testMetadata, testContextData);
    }

    public async finalizeTestRun(): Promise<void> {
        const testMetadata = await this.getTestMetadata('Finalizer');
        const finalizerTestContainer = new FinalizerTestGroup(this.webInsightsClient, this.guidGenerator);
        await this.testRunner.run(finalizerTestContainer, testMetadata, {} as TestContextData);
    }

    private async getTestMetadata(testScenarioName: string, testContextData?: TestContextData): Promise<TestRunMetadata> {
        const availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');

        return {
            environment: this.getTestEnvironment(availabilityTestConfig.environmentDefinition),
            releaseId: this.webApiConfig.releaseId,
            runId: this.runId,
            scenarioName: testScenarioName,
            scanId: testContextData?.websiteScanId,
        };
    }

    private getTestEnvironment(environment: string): TestEnvironment {
        for (const [key, value] of Object.entries(TestEnvironment)) {
            if (key === environment) {
                return value as TestEnvironment;
            }
        }

        return TestEnvironment.none;
    }
}
