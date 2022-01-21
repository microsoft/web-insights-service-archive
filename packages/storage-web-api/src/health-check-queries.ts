// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface HealthCheckQueryFactories {
    createTestResultsQueryForRelease(releaseId: string): string;
    createAvailabilityResultsQueryForRelease(releaseId: string): string;
}

export const healthCheckQueryFactories: HealthCheckQueryFactories = {
    createTestResultsQueryForRelease: (releaseId: string) => `let lastRunId = toscalar(
            customEvents
            | where name == "FunctionalTest"
                and customDimensions.testContainer == "FinalizerTestGroup"
                and customDimensions.releaseId == "${releaseId}"
            | top 1 by timestamp desc nulls last
            | project tostring(customDimensions.runId)
        );
        customEvents
        | where name == "FunctionalTest"
            and customDimensions.logSource == "TestRun"
            and customDimensions.releaseId == "${releaseId}"
            and customDimensions.runId == lastRunId
        | project timestamp,
            environment = customDimensions.environment,
            releaseId = customDimensions.releaseId,
            runId = customDimensions.runId,
            logSource = customDimensions.logSource,
            testContainer = customDimensions.testContainer,
            testName = customDimensions.testName,
            scenarioName = customDimensions.scenarioName,
            scanId = customDimensions.scanId,
            result = customDimensions.result,
            error = customDimensions.error
        | order by timestamp asc nulls last`,

    createAvailabilityResultsQueryForRelease: (releaseId: string) => `let lastRunId = toscalar(
            availabilityResults
            | where customDimensions.releaseId == "${releaseId}"
            | top 1 by timestamp desc nulls last
            | project tostring(customDimensions.runId)
        );
        availabilityResults
        | where customDimensions.releaseId == "${releaseId}"
            and customDimensions.runId == lastRunId
        | project timestamp,
            releaseId = customDimensions.releaseId,
            runId = customDimensions.runId,
            scenarioName = customDimensions.testScenarioName,
            success = (success == 1)`,
};
