// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ContextAwareLogger, Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestContainerFactory } from '../functional-tests/test-container-factory';
import { FunctionalTestGroup } from '../functional-tests/functional-test-group';
import { TestRunner } from '../functional-tests/test-runner';
import { TestPhases, TestScenarioDefinition } from './test-scenario-definitions';

import { TestScenarioDriver } from './test-scenario-driver';
import { TestScenarioSetupHandler } from './test-scenario-setup-handler';

class TestableTestScenarioDriver extends TestScenarioDriver {
    public testContextData: TestContextData;
}

class TestContainerA extends FunctionalTestGroup {}

class TestContainerB extends FunctionalTestGroup {}

describe(TestScenarioDriver, () => {
    let testScenarioDefinition: TestScenarioDefinition;
    const initialTestContextData = { websiteId: 'website id' };
    let loggerMock: IMock<Logger>;
    let setupHandlerMock: IMock<TestScenarioSetupHandler>;
    let testContainerFactoryMock: IMock<TestContainerFactory>;
    let testRunnerMock: IMock<TestRunner>;

    let testSubject: TestableTestScenarioDriver;

    beforeEach(() => {
        testScenarioDefinition = {
            readableName: 'test scenario name',
            testPhases: {
                beforeScan: [TestContainerA, TestContainerB],
            },
            websiteDataBlobName: 'blob name',
        };
        loggerMock = Mock.ofType<ContextAwareLogger>();
        setupHandlerMock = Mock.ofType<TestScenarioSetupHandler>();
        testContainerFactoryMock = Mock.ofType<TestContainerFactory>();
        testRunnerMock = Mock.ofType<TestRunner>();

        testSubject = new TestableTestScenarioDriver(
            testScenarioDefinition,
            loggerMock.object,
            setupHandlerMock.object,
            testContainerFactoryMock.object,
            testRunnerMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        setupHandlerMock.verifyAll();
        testContainerFactoryMock.verifyAll();
        testRunnerMock.verifyAll();
    });

    it('handles and logs setup error', async () => {
        const testError = new Error();
        const expectedLogProperties = {
            testScenarioName: testScenarioDefinition.readableName,
            error: JSON.stringify(testError),
        };
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).throws(testError);
        loggerMock.setup((l) => l.logError(It.isAny(), expectedLogProperties)).verifiable();
        setupTestRunnerNeverCalled();

        await testSubject.executeTestScenario();
    });

    it('handles empty test phase', async () => {
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
        testScenarioDefinition.testPhases.beforeScan = [];
        setupTestRunnerNeverCalled();

        await testSubject.executeTestScenario();
    });

    it('handles undefined test phase', async () => {
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
        testScenarioDefinition.testPhases.beforeScan = undefined;
        setupTestRunnerNeverCalled();

        await testSubject.executeTestScenario();
    });

    it('calls setup handler and runs beforeScanPhase', async () => {
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
        setupRunTestPhase('beforeScan');

        await testSubject.executeTestScenario();
    });

    function setupRunTestPhase(phase: keyof TestPhases, testContextData: TestContextData = initialTestContextData): void {
        const testsToRun = testScenarioDefinition.testPhases[phase];
        const testContainerMocks = testsToRun.map((testGroupConstructor) => {
            const testContainerMock = Mock.ofType(testGroupConstructor);
            testContainerFactoryMock
                .setup((f) => f.createTestContainer(testGroupConstructor))
                .returns(async () => testContainerMock.object);

            return testContainerMock;
        });
        const testContainerObjects = testContainerMocks.map((mock) => mock.object);

        testRunnerMock
            .setup((t) => t.runAll(testContainerObjects, { scenarioName: testScenarioDefinition.readableName }, testContextData))
            .verifiable();
    }

    function setupTestRunnerNeverCalled(): void {
        testRunnerMock.setup((tr) => tr.runAll(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());
        testRunnerMock.setup((tr) => tr.run(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());
    }
});
