// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ContextAwareLogger, Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { AvailabilityTestConfig, GuidGenerator, ServiceConfiguration } from 'common';
import { WebApiConfig } from '../web-api-config';
import { TestContainerLogProperties, TestEnvironment, TestRunLogProperties } from './common-types';
import { TestRunner } from './test-runner';
import { test } from './test-decorator';
import { FunctionalTestGroup } from './functional-test-group';
import { TestContextData } from './test-context-data';

/* eslint-disable @typescript-eslint/no-explicit-any */

class TestGroupStubBase extends FunctionalTestGroup {
    constructor() {
        super(undefined, undefined);
    }
}

class TestGroupWithContext extends TestGroupStubBase {
    public var1: string = 'some value';

    @test(TestEnvironment.all)
    public async testInstanceVariable(_: TestContextData): Promise<void> {
        expect(this.var1).toBeDefined();
        expect(this.var1).toEqual('some value');
    }

    @test(TestEnvironment.all)
    public async testContextData(testContextData: TestContextData): Promise<void> {
        expect(testContextData).toBeDefined();
        expect(testContextData).toEqual({ websiteId: 'website id' });
    }
}

class TestGroupAStub extends TestGroupStubBase {
    @test(TestEnvironment.insider)
    public async testA(_: TestContextData): Promise<void> {
        throw new Error('Error while invoked test A');
    }

    public testB(): void {
        console.log('Invoked test B');
    }

    @test(TestEnvironment.all)
    public async testC(_: TestContextData): Promise<void> {
        console.log('Invoked test C');
    }

    @test(TestEnvironment.canary)
    public async testD(_: TestContextData): Promise<void> {
        console.log('Invoked test D');
    }
}

class TestGroupBStub extends TestGroupStubBase {
    @test(TestEnvironment.all)
    public async testE(_: TestContextData): Promise<void> {
        console.log('Invoked test E');
    }
}

describe(TestRunner, () => {
    const runId = 'run id';
    const releaseId = 'release id';
    const scenarioName = 'scenarioName';
    const testContextData: TestContextData = { websiteId: 'website id' };
    let testContainerA: TestGroupAStub;
    let testContainerB: TestGroupBStub;
    let testContainerAName: string;
    let testContainerBName: string;
    let testRunner: TestRunner;
    let loggerMock: IMock<Logger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    const webApiConfig = {
        releaseId: releaseId,
    } as WebApiConfig;
    const availabilityTestConfig = {
        environmentDefinition: 'canary',
    } as AvailabilityTestConfig;

    beforeEach(() => {
        testContainerA = new TestGroupAStub();
        testContainerB = new TestGroupBStub();
        testContainerAName = testContainerA.constructor.name;
        testContainerBName = testContainerB.constructor.name;
        loggerMock = Mock.ofType<ContextAwareLogger>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigMock.setup((sc) => sc.getConfigValue('availabilityTestConfig')).returns(async () => availabilityTestConfig);
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        guidGeneratorMock.setup((gg) => gg.createGuid()).returns(() => runId);

        testRunner = new TestRunner(loggerMock.object, serviceConfigMock.object, webApiConfig, guidGeneratorMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('run all tests', async () => {
        setEnvironment(TestEnvironment.canary);
        loggerMock.setup((o) => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(5));
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testC',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testD',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerAName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerBName,
            testName: 'testE',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerBName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        await testRunner.runAll([testContainerA, testContainerB], { scenarioName }, { websiteId: 'website id' });
    });

    it('run tests for the given environment only', async () => {
        setEnvironment(TestEnvironment.canary);
        loggerMock.setup((o) => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(3));
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testC',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testD',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'canary',
            testContainer: testContainerAName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        await testRunner.run(testContainerA, { scenarioName }, testContextData);
    });

    it('handle test exception', async () => {
        setEnvironment(TestEnvironment.insider);
        loggerMock.setup((o) => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(3));
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'insider',
            testContainer: testContainerAName,
            testName: 'testA',
            result: 'fail',
            error: 'Error while invoked test A',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'insider',
            testContainer: testContainerAName,
            testName: 'testC',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'insider',
            testContainer: testContainerAName,
            result: 'fail',
            logSource: 'TestContainer',
        });

        await testRunner.run(testContainerA, { scenarioName }, testContextData);
    });

    it('Runs test with correct context', async () => {
        const testContainerWithContext = new TestGroupWithContext();
        const testContainerName = testContainerWithContext.constructor.name;
        setEnvironment(TestEnvironment.all);
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'all',
            testContainer: testContainerName,
            testName: 'testInstanceVariable',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'all',
            testContainer: testContainerName,
            testName: 'testContextData',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            scenarioName: scenarioName,
            environment: 'all',
            testContainer: testContainerName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        await testRunner.run(testContainerWithContext, { scenarioName }, testContextData);
    });

    function setupLoggerMock(
        params: (TestRunLogProperties | TestContainerLogProperties) & { runId: string; releaseId: string; environment: string },
    ): void {
        loggerMock.setup((o) => o.trackEvent('FunctionalTest', { ...params })).verifiable(Times.once());
    }

    function setEnvironment(environment: TestEnvironment): void {
        availabilityTestConfig.environmentDefinition = TestEnvironment[environment];
    }
});
