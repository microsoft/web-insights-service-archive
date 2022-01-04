// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ContextAwareLogger } from 'logger';
import { IMock, It, Mock } from 'typemoq';
import { E2ETestRunner, TestScenarioDriverFactory } from './e2e-test-runner';
import { TestScenarioSetupHandler } from './test-scenarios/test-scenario-setup-handler';
import { TestScenarioDefinition, TestScenarioDefinitionFactory } from './test-scenarios/test-scenario-definitions';
import { TestScenarioDriver } from './test-scenarios/test-scenario-driver';
import { TestContainerFactory } from './functional-tests/test-container-factory';
import { TestRunner } from './functional-tests/test-runner';
import { FinalizerTestGroup } from './functional-tests/test-groups/finalizer-test-group';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';

describe(E2ETestRunner, () => {
    let loggerMock: IMock<ContextAwareLogger>;
    let setupHandlerMock: IMock<TestScenarioSetupHandler>;
    let testContainerFactoryMock: IMock<TestContainerFactory>;
    let testRunnerMock: IMock<TestRunner>;
    let testScenarioADriverMock: IMock<TestScenarioDriver>;
    let testScenarioBDriverMock: IMock<TestScenarioDriver>;
    let testScenarioDriverFactoryMock: IMock<TestScenarioDriverFactory>;
    const testScenarioA = {
        readableName: 'Test scenario A',
    } as TestScenarioDefinition;
    const testScenarioB = {
        readableName: 'Test scenario B',
    } as TestScenarioDefinition;
    const testScenarioFactoriesStub: TestScenarioDefinitionFactory[] = [() => testScenarioA, () => testScenarioB];

    let testSubject: E2ETestRunner;

    beforeEach(() => {
        loggerMock = Mock.ofType<ContextAwareLogger>();
        setupHandlerMock = Mock.ofType<TestScenarioSetupHandler>();
        testContainerFactoryMock = Mock.ofType<TestContainerFactory>();
        testRunnerMock = Mock.ofType<TestRunner>();
        testScenarioADriverMock = Mock.ofType<TestScenarioDriver>();
        testScenarioBDriverMock = Mock.ofType<TestScenarioDriver>();
        testScenarioDriverFactoryMock = Mock.ofType<TestScenarioDriverFactory>();

        testSubject = new E2ETestRunner(
            loggerMock.object,
            setupHandlerMock.object,
            testContainerFactoryMock.object,
            testRunnerMock.object,
            testScenarioFactoriesStub,
            testScenarioDriverFactoryMock.object,
        );
    });

    afterEach(() => {
        testScenarioADriverMock.verifyAll();
        testScenarioBDriverMock.verifyAll();
        testContainerFactoryMock.verifyAll();
        testRunnerMock.verifyAll();
    });

    it('Initializes test scenarios and runs all tests', async () => {
        setupTestScenarioDriverFactory();
        testScenarioADriverMock.setup((a) => a.executeTestScenario()).verifiable();
        testScenarioBDriverMock.setup((b) => b.executeTestScenario()).verifiable();
        setupRunFinalizerTest();

        await testSubject.run();
    });

    function setupTestScenarioDriverFactory(): void {
        testScenarioDriverFactoryMock
            .setup((t) =>
                t(testScenarioA, loggerMock.object, setupHandlerMock.object, testContainerFactoryMock.object, testRunnerMock.object),
            )
            .returns(() => testScenarioADriverMock.object);
        testScenarioDriverFactoryMock
            .setup((t) =>
                t(testScenarioB, loggerMock.object, setupHandlerMock.object, testContainerFactoryMock.object, testRunnerMock.object),
            )
            .returns(() => testScenarioBDriverMock.object);
    }

    function setupRunFinalizerTest(): void {
        const finalizerTestContainerMock = Mock.ofType<FinalizerTestGroup>();
        getPromisableDynamicMock(finalizerTestContainerMock);
        testContainerFactoryMock
            .setup((f) => f.createTestContainer(FinalizerTestGroup))
            .returns(async () => finalizerTestContainerMock.object);
        testRunnerMock.setup((tr) => tr.run(finalizerTestContainerMock.object, It.isAny(), It.isAny()));
    }
});
