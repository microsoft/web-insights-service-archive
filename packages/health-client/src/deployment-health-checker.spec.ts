// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { ResponseWithBodyType } from 'common';
import { Logger } from 'logger';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { WebInsightsStorageClient } from 'storage-api-client';
import { DeploymentHealthChecker } from './deployment-health-checker';

describe(DeploymentHealthChecker, () => {
    let loggerMock: IMock<Logger>;
    let webInsightsClientMock: IMock<WebInsightsStorageClient>;
    let waitMock: IMock<(milliseconds: number) => Promise<void>>;
    const startTime = new Date(1, 2, 3, 4);
    let currentTime: Date;
    const getCurrentTimeStub = () => currentTime;

    const testTimeoutInMinutes = 1;
    const waitTimeBeforeEvaluationInMinutes = 3;
    const evaluationIntervalInMinutes = 2;
    const releaseId = '123';
    const expectedFailureMessage = 'Functional tests result validation timed out.';

    let testSubject: DeploymentHealthChecker;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        webInsightsClientMock = Mock.ofType<WebInsightsStorageClient>();
        waitMock = Mock.ofInstance(() => null, MockBehavior.Strict);

        currentTime = startTime;

        testSubject = new DeploymentHealthChecker(loggerMock.object, webInsightsClientMock.object, waitMock.object, getCurrentTimeStub);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        webInsightsClientMock.verifyAll();
        waitMock.verifyAll();
    });

    it.each(['warn', 'fail'])('Times out if test status = %s', async (status) => {
        const healthCheckResponse = {
            statusCode: 200,
            body: {
                healthStatus: status,
            },
        } as ResponseWithBodyType<ApiContracts.HealthReport>;
        webInsightsClientMock
            .setup((a) => a.getHealthReport(releaseId))
            .returns(async () => healthCheckResponse)
            .verifiable(Times.exactly(2));
        setupWait(waitTimeBeforeEvaluationInMinutes);
        setupWait(evaluationIntervalInMinutes);

        expect(
            testSubject.run(testTimeoutInMinutes, waitTimeBeforeEvaluationInMinutes, evaluationIntervalInMinutes, releaseId),
        ).rejects.toThrow(expectedFailureMessage);
    });

    it('Times out if status code is not 200', async () => {
        const healthCheckResponse = {
            statusCode: 404,
        } as ResponseWithBodyType<ApiContracts.HealthReport>;
        webInsightsClientMock
            .setup((a) => a.getHealthReport(releaseId))
            .returns(async () => healthCheckResponse)
            .verifiable(Times.exactly(2));
        setupWait(waitTimeBeforeEvaluationInMinutes);
        setupWait(evaluationIntervalInMinutes);

        expect(
            testSubject.run(testTimeoutInMinutes, waitTimeBeforeEvaluationInMinutes, evaluationIntervalInMinutes, releaseId),
        ).rejects.toThrow(expectedFailureMessage);
    });

    it('Times out if API client throws an error', async () => {
        const testError = new Error('test error');
        webInsightsClientMock.setup((a) => a.getHealthReport(It.isAny())).throws(testError);
        setupWait(waitTimeBeforeEvaluationInMinutes);
        setupWait(evaluationIntervalInMinutes);

        expect(
            testSubject.run(testTimeoutInMinutes, waitTimeBeforeEvaluationInMinutes, evaluationIntervalInMinutes, releaseId),
        ).rejects.toThrow(expectedFailureMessage);
    });

    it('Completes if health check passes', async () => {
        const response = {
            statusCode: 200,
            body: {
                healthStatus: 'pass',
                testRuns: [
                    {
                        scanId: 'scan-id-1',
                        scenarioName: 'Scenario1',
                    },
                    {
                        scanId: 'scan-id-1',
                        scenarioName: 'Scenario1',
                    },
                    {
                        scanId: 'scan-id-2',
                        scenarioName: 'Scenario2',
                    },
                    {},
                ],
            },
        } as ResponseWithBodyType<ApiContracts.HealthReport>;
        webInsightsClientMock
            .setup((a) => a.getHealthReport(releaseId))
            .returns(async () => response)
            .verifiable(Times.once());
        setupWait(waitTimeBeforeEvaluationInMinutes);

        await testSubject.run(testTimeoutInMinutes, waitTimeBeforeEvaluationInMinutes, evaluationIntervalInMinutes, releaseId);
    });

    function setupWait(waitIntervalInMinutes: number): void {
        waitMock
            .setup((w) => w(waitIntervalInMinutes * 60000))
            .callback(async (milliseconds) => {
                currentTime = addMillisecondsToDate(milliseconds, currentTime);
            })
            .verifiable();
    }

    function addMillisecondsToDate(milliseconds: number, date: Date): Date {
        const dateMilliseconds = date.getTime();

        return new Date(dateMilliseconds + milliseconds);
    }
});
