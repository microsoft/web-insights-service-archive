// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { TestContainerLogProperties, TestDefinition, TestEnvironment, TestRunLogProperties } from './common-types';
import { FunctionalTestGroup } from './functional-test-group';
import { getDefinedTestsMetadata } from './test-decorator';
import { TestContextData } from './test-context-data';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TestRunMetadata = {
    environment: TestEnvironment;
    releaseId: string;
    runId: string;
    scenarioName: string;
    scanId?: string;
};

@injectable()
export class TestRunner {
    public constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger) {}

    public async runAll(testContainers: FunctionalTestGroup[], metadata: TestRunMetadata, testContextData: TestContextData): Promise<void> {
        await Promise.all(testContainers.map(async (testContainer) => this.run(testContainer, metadata, testContextData)));
    }

    public async run(testContainer: FunctionalTestGroup, metadata: TestRunMetadata, testContextData: TestContextData): Promise<void> {
        const definedTests = getDefinedTestsMetadata(testContainer);
        // eslint-disable-next-line no-bitwise
        const targetedTests = definedTests.filter((definedTest) => definedTest.environments & metadata.environment);
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
            environment: TestEnvironment[metadata.environment],
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
                environment: TestEnvironment[metadata.environment],
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                result: 'pass',
            });

            return true;
        } catch (error) {
            this.log({
                ...metadata,
                logSource: 'TestRun',
                environment: TestEnvironment[metadata.environment],
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
            ...properties,
        });
    }
}
