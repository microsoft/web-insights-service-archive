// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { ContextAwareLogger, Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanType } from 'storage-documents';
import { ResponseWithBodyType } from 'common';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestContainerFactory } from '../functional-tests/test-container-factory';
import { FunctionalTestGroup } from '../functional-tests/functional-test-group';
import { TestRunner } from '../functional-tests/test-runner';
import { WebApiConfig } from '../web-api-config';
import { TestPhases, TestScenarioDefinition } from './test-scenario-definitions';
import { TestScenarioDriver } from './test-scenario-driver';
import { TestScenarioSetupHandler } from './test-scenario-setup-handler';
import { TestScanHandler } from './test-scan-handler';

class TestContainerA extends FunctionalTestGroup {}

class TestContainerB extends FunctionalTestGroup {}

class TestContainerC extends FunctionalTestGroup {}

describe(TestScenarioDriver, () => {
    let testScenarioDefinition: TestScenarioDefinition;
    const websiteId = 'website id';
    const websiteScanId = 'website scan id';
    const initialTestContextData: TestContextData = { websiteId, websiteScans: [] };
    const runId = 'test run id';
    const webApiConfig = { releaseId: 'release id' } as WebApiConfig;
    let loggerMock: IMock<Logger>;
    let setupHandlerMock: IMock<TestScenarioSetupHandler>;
    let testContainerFactoryMock: IMock<TestContainerFactory>;
    let testRunnerMock: IMock<TestRunner>;
    let testScanHandlerMock: IMock<TestScanHandler>;

    let testSubject: TestScenarioDriver;

    beforeEach(() => {
        testScenarioDefinition = {
            readableName: 'test scenario name',
            testPhases: {
                beforeScan: [TestContainerA, TestContainerB],
                afterScanSubmission: [TestContainerC],
            },
            websiteDataBlobName: 'blob name',
            scansToRun: ['a11y', 'privacy'],
        };
        loggerMock = Mock.ofType<ContextAwareLogger>();
        setupHandlerMock = Mock.ofType<TestScenarioSetupHandler>();
        testContainerFactoryMock = Mock.ofType<TestContainerFactory>();
        testRunnerMock = Mock.ofType<TestRunner>();
        testScanHandlerMock = Mock.ofType<TestScanHandler>();

        testSubject = new TestScenarioDriver(
            testScenarioDefinition,
            loggerMock.object,
            setupHandlerMock.object,
            testContainerFactoryMock.object,
            testRunnerMock.object,
            testScanHandlerMock.object,
            webApiConfig,
            runId,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        setupHandlerMock.verifyAll();
        testContainerFactoryMock.verifyAll();
        testRunnerMock.verifyAll();
        testScanHandlerMock.verifyAll();
    });

    it('handles and logs setup error', async () => {
        const testError = new Error();
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).throws(testError);
        setupLogFailure();
        setupTestRunnerNeverCalled();

        await testSubject.executeTestScenario();
    });

    it('handles empty test phase', async () => {
        testScenarioDefinition.testPhases.beforeScan = [];
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
        setupTestRunnerNeverCalled();
        setupFailedScanSubmission(It.isAny());

        await testSubject.executeTestScenario();
    });

    it('handles undefined test phase', async () => {
        testScenarioDefinition.testPhases.beforeScan = undefined;
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
        setupTestRunnerNeverCalled();
        setupFailedScanSubmission(It.isAny());

        await testSubject.executeTestScenario();
    });

    it.each([{ statusCode: 404 }, { statusCode: 204, body: undefined }] as ResponseWithBodyType<ApiContracts.WebsiteScan>[])(
        'logs error if scan submission returns %s',
        async (errorResponse) => {
            setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
            setupRunTestPhase('beforeScan');
            setupFailedScanSubmission('a11y', errorResponse);
            setupLogFailure();

            await testSubject.executeTestScenario();
        },
    );

    it('executes all steps, runs all tests, and tracks availability if no failures', async () => {
        const textContextDataWithScans: TestContextData = {
            ...initialTestContextData,
            websiteScans: [
                { scanId: websiteScanId, scanType: 'a11y' },
                { scanId: websiteScanId, scanType: 'privacy' },
            ],
        };
        setupHandlerMock.setup((s) => s.setUpTestScenario(testScenarioDefinition)).returns(async () => initialTestContextData);
        setupRunTestPhase('beforeScan');
        setupSuccessfulScanSubmission('a11y');
        setupSuccessfulScanSubmission('privacy');
        setupRunTestPhase('afterScanSubmission', textContextDataWithScans);
        loggerMock.setup((l) => l.trackAvailability('workerAvailabilityTest', It.isObjectWith({ success: true }))).verifiable();

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

    function setupLogFailure(): void {
        loggerMock.setup((l) => l.logError(It.isAny(), It.isAny())).verifiable();
        loggerMock.setup((l) => l.trackAvailability('workerAvailabilityTest', It.isObjectWith({ success: false }))).verifiable();
        loggerMock.setup((l) => l.trackAvailability(It.isAny(), It.isObjectWith({ success: true }))).verifiable(Times.never());
    }

    function setupSuccessfulScanSubmission(scanType: ScanType): void {
        const response = {
            statusCode: 201,
            body: {
                id: websiteScanId,
            },
        } as ResponseWithBodyType<ApiContracts.WebsiteScan>;
        testScanHandlerMock
            .setup((t) => t.submitTestScan(scanType, websiteId))
            .returns(async () => response)
            .verifiable();
    }

    function setupFailedScanSubmission(scanType: ScanType, errorResponse?: ResponseWithBodyType<ApiContracts.WebsiteScan>): void {
        const response = errorResponse ?? ({ statusCode: 404 } as ResponseWithBodyType<ApiContracts.WebsiteScan>);
        testScanHandlerMock.setup((t) => t.submitTestScan(scanType, websiteId)).returns(async () => response);
    }
});
