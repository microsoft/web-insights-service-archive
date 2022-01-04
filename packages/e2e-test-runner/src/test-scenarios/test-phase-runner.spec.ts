// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig, GuidGenerator, ServiceConfiguration } from 'common';
import 'reflect-metadata';
import { WebInsightsStorageClient } from 'storage-api-client';
import { IMock, It, Mock } from 'typemoq';
import { TestEnvironment } from '../functional-tests/common-types';
import { FunctionalTestGroup } from '../functional-tests/functional-test-group';
import { TestContextData } from '../functional-tests/test-context-data';
import { FinalizerTestGroup } from '../functional-tests/test-groups/finalizer-test-group';
import { TestRunMetadata, TestRunner } from '../functional-tests/test-runner';
import { WebApiConfig } from '../web-api-config';
import { TestPhaseRunner } from './test-phase-runner';
import { TestScenarioDefinition } from './test-scenario-definitions';

class TestGroupA extends FunctionalTestGroup {}

class TestGroupB extends FunctionalTestGroup {}

describe(TestPhaseRunner, () => {
    const testScenarioName = 'test scenario name';
    const availabilityTestConfig: AvailabilityTestConfig = {
        environmentDefinition: 'canary',
    };
    const testContextData: TestContextData = {
        websiteId: 'website id',
    };
    const guid = 'guid';

    let testRunnerMock: IMock<TestRunner>;
    let webInsightsClientMock: IMock<WebInsightsStorageClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    const webApiConfig: WebApiConfig = {
        baseUrl: 'base url',
        releaseId: 'release id',
    };

    let testSubject: TestPhaseRunner;

    beforeEach(() => {
        testRunnerMock = Mock.ofType<TestRunner>();
        webInsightsClientMock = Mock.ofType<WebInsightsStorageClient>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigMock.setup((sc) => sc.getConfigValue('availabilityTestConfig')).returns(async () => availabilityTestConfig);
        guidGeneratorMock.setup((gg) => gg.createGuid()).returns(() => guid);

        testSubject = new TestPhaseRunner(
            testRunnerMock.object,
            webInsightsClientMock.object,
            guidGeneratorMock.object,
            webApiConfig,
            serviceConfigMock.object,
        );
    });

    afterEach(() => {
        testRunnerMock.verifyAll();
    });

    describe('runTestPhaseForScenario', () => {
        it('Handles scenario with undefined test phase', async () => {
            const testScenarioDefinition = {
                readableName: testScenarioName,
                testPhases: {},
            } as TestScenarioDefinition;

            await testSubject.runTestPhaseForScenario('beforeScan', testScenarioDefinition, testContextData);
        });

        it('Handles scenario with empty list for test phase', async () => {
            const testScenarioDefinition = {
                readableName: testScenarioName,
                testPhases: {
                    beforeScan: [],
                },
            } as TestScenarioDefinition;

            await testSubject.runTestPhaseForScenario('beforeScan', testScenarioDefinition, testContextData);
        });

        it('Runs all test groups with expected data', async () => {
            const testScenarioDefinition = {
                readableName: testScenarioName,
                testPhases: {
                    beforeScan: [TestGroupA, TestGroupB],
                },
            } as TestScenarioDefinition;
            const expectedMetadata: TestRunMetadata = {
                environment: TestEnvironment.canary,
                releaseId: webApiConfig.releaseId,
                runId: guid,
                scenarioName: testScenarioName,
                scanId: testContextData.websiteScanId,
            };

            const isExpectedTestGroupList = (testGroups: FunctionalTestGroup[]) => {
                return testGroups.length === 2 && testGroups[0] instanceof TestGroupA && testGroups[1] instanceof TestGroupB;
            };

            testRunnerMock.setup((tr) => tr.runAll(It.is(isExpectedTestGroupList), expectedMetadata, testContextData)).verifiable();

            await testSubject.runTestPhaseForScenario('beforeScan', testScenarioDefinition, testContextData);
        });
    });

    describe('FinalizeTestRun', () => {
        it('Runs finalizer test group', async () => {
            const expectedMetadata: TestRunMetadata = {
                environment: TestEnvironment.canary,
                releaseId: webApiConfig.releaseId,
                runId: guid,
                scenarioName: 'Finalizer',
                scanId: undefined,
            };

            const isFinalizerTestGroup = (testGroup: FunctionalTestGroup) => testGroup instanceof FinalizerTestGroup;
            testRunnerMock.setup((tr) => tr.run(It.is(isFinalizerTestGroup), expectedMetadata, It.isAny())).verifiable();

            await testSubject.finalizeTestRun();
        });
    });
});
