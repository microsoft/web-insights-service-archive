// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AvailabilityTestConfig, GuidGenerator, ServiceConfiguration } from 'common';
import { WebApiConfig } from '../web-api-config';
import { TestContainerLogProperties, TestDefinition, TestEnvironment, TestRunLogProperties } from './common-types';
import { FunctionalTestGroup } from './functional-test-group';
import { getDefinedTestsMetadata } from './test-decorator';
import { TestContextData } from './test-context-data';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TestRunMetadata = {
    scenarioName: string;
    scanId?: string;
};

@injectable()
export class TestRunner {
    private readonly runId: string;

    private availabilityTestConfig: AvailabilityTestConfig;

    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(WebApiConfig) private readonly webApiConfig: WebApiConfig,
        @inject(GuidGenerator) guidGenerator: GuidGenerator,
    ) {
        this.runId = guidGenerator.createGuid();
    }

    public async runAll(testContainers: FunctionalTestGroup[], metadata: TestRunMetadata, testContextData: TestContextData): Promise<void> {
        await this.setAvailabilityTestConfig();
        await Promise.all(testContainers.map(async (testContainer) => this.run(testContainer, metadata, testContextData)));
    }

    public async run(testContainer: FunctionalTestGroup, metadata: TestRunMetadata, testContextData: TestContextData): Promise<void> {
        await this.setAvailabilityTestConfig();

        const definedTests = getDefinedTestsMetadata(testContainer);
        const testEnvironment = this.getTestEnvironment();
        // eslint-disable-next-line no-bitwise
        const targetedTests = definedTests.filter((definedTest) => definedTest.environments & testEnvironment);
        let containerPass = true;
        await Promise.all(
            targetedTests.map(async (targetedTest) => {
                const testPass = await this.runTest(targetedTest, testContainer, metadata, testContextData);

                containerPass = containerPass && testPass;
            }),
        );

        const testContainerName = testContainer.constructor.name;
        this.log({
            ...metadata,
            logSource: 'TestContainer',
            testContainer: testContainerName,
            result: containerPass ? 'pass' : 'fail',
        });
    }

    private async runTest(
        testDefinition: TestDefinition,
        testContainer: FunctionalTestGroup,
        metadata: TestRunMetadata,
        testContextData: TestContextData,
    ): Promise<boolean> {
        try {
            await Promise.resolve(testDefinition.testImplFunc.call(testContainer, testContextData));

            this.log({
                ...metadata,
                logSource: 'TestRun',
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                result: 'pass',
            });

            return true;
        } catch (error) {
            this.log({
                ...metadata,
                logSource: 'TestRun',
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                result: 'fail',
                error: error.message !== undefined ? error.message : error,
            });

            return false;
        }
    }

    private log(properties: TestRunLogProperties | TestContainerLogProperties): void {
        this.logger.trackEvent('FunctionalTest', {
            environment: this.availabilityTestConfig.environmentDefinition,
            releaseId: this.webApiConfig.releaseId,
            runId: this.runId,
            ...properties,
        });
    }

    private async setAvailabilityTestConfig(): Promise<void> {
        if (!this.availabilityTestConfig) {
            this.availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');
        }
    }

    private getTestEnvironment(): TestEnvironment {
        for (const [key, value] of Object.entries(TestEnvironment)) {
            if (key === this.availabilityTestConfig.environmentDefinition) {
                return value as TestEnvironment;
            }
        }

        return TestEnvironment.none;
    }
}
