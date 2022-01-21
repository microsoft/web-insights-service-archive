// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { ApplicationInsightsQueryResponse } from 'azure-services';
import { createHealthReport } from './query-response-to-health-report-converter';

describe(createHealthReport, () => {
    let testRunResponse: ApplicationInsightsQueryResponse;
    let availabilityResponse: ApplicationInsightsQueryResponse;
    let expectedHealthReport: ApiContracts.HealthReport;

    beforeEach(() => {
        testRunResponse = {
            tables: [
                {
                    columns: [
                        { name: 'timestamp', type: 'datetime' },
                        { name: 'environment', type: 'dynamic' },
                        { name: 'releaseId', type: 'dynamic' },
                        { name: 'runId', type: 'dynamic' },
                        { name: 'logSource', type: 'dynamic' },
                        { name: 'testContainer', type: 'dynamic' },
                        { name: 'testName', type: 'dynamic' },
                        { name: 'result', type: 'dynamic' },
                        { name: 'scenarioName', type: 'dynamic' },
                        { name: 'scanId', type: 'dynamic' },
                        { name: 'error', type: 'dynamic' },
                    ],
                    rows: [
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'ValidationATestGroup',
                            'testA1',
                            'pass',
                            'TestScenario1',
                            'scan-id-1',
                        ],
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'ValidationBTestGroup',
                            'testB1',
                            'pass',
                            'TestScenario1',
                            'scan-id-1',
                        ],
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'FinalizerTestGroup',
                            'functionalTestsFinalizer',
                            'pass',
                            'FinalizerScenario',
                        ],
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'ValidationATestGroup',
                            'testA3',
                            'fail',
                            'TestScenario2',
                            'scan-id-2',
                            'error from test A3',
                        ],
                    ],
                    name: 'PrimaryResult',
                },
            ],
        };
        availabilityResponse = {
            tables: [
                {
                    columns: [
                        { name: 'scenarioName', type: 'dynamic' },
                        { name: 'timestamp', type: 'datetime' },
                        { name: 'success', type: 'boolean' },
                    ],
                    rows: [
                        ['TestScenario1', '2020-01-13T03:11:10.352Z', true],
                        ['TestScenario2', '2020-01-13T03:11:20.352Z', false],
                    ],
                    name: 'PrimaryResult',
                },
            ],
        };
        expectedHealthReport = {
            healthStatus: 'fail',
            environment: 'canary',
            releaseId: '2419',
            runId: '1ea35b25-3238-68f0-774d-7c98f231af4f',
            availabilityResults: [
                {
                    scenarioName: 'TestScenario1',
                    timestamp: new Date('2020-01-13T03:11:10.352Z'),
                    success: true,
                },
                {
                    scenarioName: 'TestScenario2',
                    timestamp: new Date('2020-01-13T03:11:20.352Z'),
                    success: false,
                },
            ],
            testRuns: [
                {
                    testContainer: 'ValidationATestGroup',
                    testName: 'testA1',
                    scenarioName: 'TestScenario1',
                    scanId: 'scan-id-1',
                    result: 'pass',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                },
                {
                    testContainer: 'ValidationBTestGroup',
                    testName: 'testB1',
                    scenarioName: 'TestScenario1',
                    scanId: 'scan-id-1',
                    result: 'pass',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                },
                {
                    testContainer: 'FinalizerTestGroup',
                    testName: 'functionalTestsFinalizer',
                    scenarioName: 'FinalizerScenario',
                    scanId: undefined,
                    result: 'pass',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                },
                {
                    testContainer: 'ValidationATestGroup',
                    testName: 'testA3',
                    scenarioName: 'TestScenario2',
                    scanId: 'scan-id-2',
                    result: 'fail',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                    error: 'error from test A3',
                },
            ],
            testsPassed: 3,
            testsFailed: 1,
        };
    });

    it('Returns expected report', () => {
        const actualHealthReport = createHealthReport(testRunResponse, availabilityResponse);

        expect(actualHealthReport).toEqual(expectedHealthReport);
    });

    it('returns warn health report result when no test result found', async () => {
        testRunResponse.tables[0].rows = [];

        const actualHealthReport = createHealthReport(testRunResponse, availabilityResponse);

        expect(actualHealthReport).toMatchObject({ healthStatus: 'warn' });
    });

    it('returns warn health report result when no availability result found', async () => {
        availabilityResponse.tables[0].rows = [];

        const actualHealthReport = createHealthReport(testRunResponse, availabilityResponse);

        expect(actualHealthReport.healthStatus).toEqual('warn');
    });

    it('returns fail health report if all tests pass and one availability test fails', () => {
        const testResultColumn = 7;
        testRunResponse.tables[0].rows.forEach((row) => (row[testResultColumn] = 'pass'));

        const actualHealthReport = createHealthReport(testRunResponse, availabilityResponse);

        expect(actualHealthReport.healthStatus).toEqual('fail');
    });

    it('returns fail health report if all availability results pass and one test fails', () => {
        const availabilitySuccessColumn = 2;
        availabilityResponse.tables[0].rows.forEach((row) => (row[availabilitySuccessColumn] = true));

        const actualHealthReport = createHealthReport(testRunResponse, availabilityResponse);

        expect(actualHealthReport.healthStatus).toEqual('fail');
    });

    it('returns pass health report if all tests and all availability results pass', () => {
        const testResultColumn = 7;
        testRunResponse.tables[0].rows.forEach((row) => (row[testResultColumn] = 'pass'));

        const availabilitySuccessColumn = 2;
        availabilityResponse.tables[0].rows.forEach((row) => (row[availabilitySuccessColumn] = true));

        const actualHealthReport = createHealthReport(testRunResponse, availabilityResponse);

        expect(actualHealthReport.healthStatus).toEqual('pass');
    });
});
