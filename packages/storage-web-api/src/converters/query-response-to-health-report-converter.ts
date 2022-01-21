// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import _ from 'lodash';
import { ApplicationInsightsQueryResponse, Column } from 'azure-services';

export type QueryResponseToHealthReportConverter = (
    testResultsResponse: ApplicationInsightsQueryResponse,
    availabilityResultsResponse: ApplicationInsightsQueryResponse,
) => ApiContracts.HealthReport;

function getColumnValue<T = string>(columns: Column[], row: string[], columnName: string): T {
    const index = columns.findIndex((c) => c.name === columnName);

    return (index > -1 && row !== undefined && row.length > index
        ? row[columns.findIndex((c) => c.name === columnName)]
        : undefined) as unknown as T;
}

const getTestRuns = (testResultsResponse: ApplicationInsightsQueryResponse): ApiContracts.TestRun[] => {
    const table = testResultsResponse.tables[0];
    const columns = table.columns;

    const testRuns: ApiContracts.TestRun[] = [];
    table.rows.forEach((row) => {
        const result = getColumnValue(columns, row, 'result') as ApiContracts.TestRunResult;

        const testRun: ApiContracts.TestRun = {
            testContainer: getColumnValue(columns, row, 'testContainer'),
            testName: getColumnValue(columns, row, 'testName'),
            scenarioName: getColumnValue(columns, row, 'scenarioName'),
            scanId: getColumnValue(columns, row, 'scanId'),
            result: result,
            timestamp: new Date(getColumnValue(columns, row, 'timestamp')),
        };

        if (result === 'fail') {
            testRun.error = getColumnValue(columns, row, 'error');
        }

        testRuns.push(testRun);
    });

    return testRuns;
};

const getAvailabilityResults = (availabilityResultsResponse: ApplicationInsightsQueryResponse): ApiContracts.AvailabilityResult[] => {
    const table = availabilityResultsResponse.tables[0];
    const columns = table.columns;

    const availabilityResults: ApiContracts.AvailabilityResult[] = [];
    table.rows.forEach((row) => {
        const availabilityResult: ApiContracts.AvailabilityResult = {
            scenarioName: getColumnValue(columns, row, 'scenarioName'),
            timestamp: new Date(getColumnValue(columns, row, 'timestamp')),
            success: getColumnValue<boolean>(columns, row, 'success'),
        };

        availabilityResults.push(availabilityResult);
    });

    return availabilityResults;
};

export const createHealthReport: QueryResponseToHealthReportConverter = (testResultsResponse, availabilityResultsResponse) => {
    const testRuns = getTestRuns(testResultsResponse);
    const availabilityResults = getAvailabilityResults(availabilityResultsResponse);

    const table = testResultsResponse.tables[0];
    const columns = table.columns;
    const environment = getColumnValue(columns, table.rows[0], 'environment') as ApiContracts.TestEnvironment;
    const runId = getColumnValue(columns, table.rows[0], 'runId');
    const releaseId = getColumnValue(columns, table.rows[0], 'releaseId');
    let healthStatus: ApiContracts.TestRunResult;
    if (testRuns.length <= 0 || availabilityResults.length <= 0) {
        healthStatus = 'warn';
    } else {
        healthStatus =
            _.every(testRuns, (testRun) => testRun.result === 'pass') && _.every(availabilityResults, (result) => result.success)
                ? 'pass'
                : 'fail';
    }

    return {
        healthStatus,
        environment: environment,
        releaseId: releaseId,
        runId: runId,
        availabilityResults: availabilityResults,
        testRuns: testRuns,
        testsPassed: testRuns.filter((testRun) => testRun.result === 'pass').length,
        testsFailed: testRuns.filter((testRun) => testRun.result === 'fail').length,
    };
};
