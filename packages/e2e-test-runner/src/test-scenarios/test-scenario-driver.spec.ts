// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ContextAwareLogger, Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestPhaseRunner } from './test-phase-runner';
import { TestPhases, TestScenarioDefinition } from './test-scenario-definitions';

import { TestScenarioDriver } from './test-scenario-driver';
import { TestScenarioSetupHandler } from './test-scenario-setup-handler';

class TestableTestScenarioDriver extends TestScenarioDriver {
    public testContextData: TestContextData;
}

describe(TestScenarioDriver, () => {
    const testScenarioDefinition: TestScenarioDefinition = {
        readableName: 'test scenario name',
        testPhases: {},
        websiteDataBlobName: 'blob name',
    };
    const initialTestContextData = { websiteId: 'website id' };
    let loggerMock: IMock<Logger>;
    let setupHandlerMock: IMock<TestScenarioSetupHandler>;
    let testPhaseRunnerMock: IMock<TestPhaseRunner>;

    let testSubject: TestableTestScenarioDriver;

    beforeEach(() => {
        loggerMock = Mock.ofType<ContextAwareLogger>();
        setupHandlerMock = Mock.ofType<TestScenarioSetupHandler>();
        testPhaseRunnerMock = Mock.ofType<TestPhaseRunner>();

        testSubject = new TestableTestScenarioDriver(
            testScenarioDefinition,
            loggerMock.object,
            setupHandlerMock.object,
            testPhaseRunnerMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        setupHandlerMock.verifyAll();
        testPhaseRunnerMock.verifyAll();
    });

    it('handles and logs setup error', async () => {
        const testError = new Error();
        const expectedLogProperties = {
            testScenarioName: testScenarioDefinition.readableName,
            error: JSON.stringify(testError),
        };
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).throws(testError);
        loggerMock.setup((l) => l.logError(It.isAny(), expectedLogProperties)).verifiable();
        testPhaseRunnerMock.setup((t) => t.runTestPhaseForScenario(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

        await testSubject.executeTestScenario();
    });

    it('calls setup handler and saves testContextData', async () => {
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
        setupRunTestPhase('beforeScan');

        await testSubject.executeTestScenario();
    });

    function setupRunTestPhase(phase: keyof TestPhases, testContextData: TestContextData = initialTestContextData): void {
        testPhaseRunnerMock.setup((t) => t.runTestPhaseForScenario(phase, testScenarioDefinition, testContextData));
    }
});
