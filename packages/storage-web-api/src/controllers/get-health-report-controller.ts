// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import {
    ApplicationInsightsClientProvider,
    ApplicationInsightsQueryResponse,
    authorize,
    Column,
    AzureServicesIocTypes,
} from 'azure-services';
import { AvailabilityTestConfig, getSerializableResponse, ResponseWithBodyType, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ApiController, HttpResponse, WebApiErrorCodes } from 'service-library';
import { createHealthCheckQueryForRelease } from '../health-check-query';
import { GetHealthReportRequestValidator } from '../request-validators/get-health-report-request-validator';
import { WebApiConfig } from '../web-api-config';

export declare type HealthTarget = 'release';

@authorize('aclApiReadAll')
@injectable()
export class GetHealthReportController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'web-api-health-check';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(AzureServicesIocTypes.ApplicationInsightsClientProvider)
        protected readonly appInsightsClientProvider: ApplicationInsightsClientProvider,
        @inject(WebApiConfig) private readonly webApiConfig: WebApiConfig,
        @inject(GetHealthReportRequestValidator) requestValidator: GetHealthReportRequestValidator,
        protected readonly createQueryForRelease: typeof createHealthCheckQueryForRelease = createHealthCheckQueryForRelease,
    ) {
        super(logger, requestValidator);
    }

    public async handleRequest(): Promise<void> {
        this.logger.trackEvent('HealthCheck');
        this.logger.setCommonProperties({ source: 'getHealthCheckReportRESTApi' });

        const target: HealthTarget = this.context.bindingData.target as HealthTarget;
        if (target === undefined) {
            this.processEchoHealthRequest();
        } else if (target === 'release') {
            await this.processReleaseHealthRequest();
        }
    }

    // Override this method not to check api version
    protected validateApiVersion(): boolean {
        return true;
    }

    private async processReleaseHealthRequest(): Promise<void> {
        const releaseId = (this.context.bindingData.targetId as string) ?? this.webApiConfig.releaseId;

        const queryResponse = await this.executeAppInsightsQuery(releaseId);
        if (queryResponse.statusCode !== 200) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);

            return;
        }

        const healthReport = this.getHealthReport(queryResponse.body, releaseId);

        this.context.res = {
            status: 200, // OK
            body: healthReport,
        };
    }

    private async executeAppInsightsQuery(releaseId: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const appInsightsClient = await this.appInsightsClientProvider();
        const logQueryTimeRange = (await this.getAvailabilityTestConfig()).logQueryTimeRange;
        const queryString = this.createQueryForRelease(releaseId);
        const queryResponse = await appInsightsClient.executeQuery(queryString, logQueryTimeRange);
        if (queryResponse.statusCode === 200) {
            this.logger.logInfo('App Insights query succeeded.', {
                query: queryString,
                statusCode: queryResponse.statusCode.toString(),
                response: JSON.stringify(getSerializableResponse(queryResponse)),
            });
        } else {
            this.logger.logError('App Insights query failed.', {
                query: queryString,
                statusCode: queryResponse.statusCode.toString(),
                response: JSON.stringify(getSerializableResponse(queryResponse)),
            });
        }

        return queryResponse;
    }

    private getHealthReport(queryResponse: ApplicationInsightsQueryResponse, releaseId: string): ApiContracts.HealthReport {
        const table = queryResponse.tables[0];
        const columns = table.columns;

        let testsPassed = 0;
        let testsFailed = 0;
        const testRuns: ApiContracts.TestRun[] = [];
        table.rows.forEach((row) => {
            const result = this.getColumnValue(columns, row, 'result') as ApiContracts.TestRunResult;
            if (result === 'pass') {
                testsPassed += 1;
            } else {
                testsFailed += 1;
            }

            const testRun: ApiContracts.TestRun = {
                testContainer: this.getColumnValue(columns, row, 'testContainer'),
                testName: this.getColumnValue(columns, row, 'testName'),
                scenarioName: this.getColumnValue(columns, row, 'scenarioName'),
                scanId: this.getColumnValue(columns, row, 'scanId'),
                result: result,
                timestamp: new Date(this.getColumnValue(columns, row, 'timestamp')),
            };

            if (result === 'fail') {
                testRun.error = this.getColumnValue(columns, row, 'error');
            }

            testRuns.push(testRun);
        });

        const environment = this.getColumnValue(columns, table.rows[0], 'environment') as ApiContracts.TestEnvironment;
        const runId = this.getColumnValue(columns, table.rows[0], 'runId');
        const healthStatus = testRuns.length > 0 ? (testsFailed === 0 ? 'pass' : 'fail') : 'warn';

        return {
            healthStatus,
            environment: environment,
            releaseId: releaseId,
            runId: runId,
            testRuns: testRuns,
            testsPassed: testsPassed,
            testsFailed: testsFailed,
        };
    }

    private processEchoHealthRequest(): void {
        this.context.res = {
            status: 200, // OK
        };
    }

    private getColumnValue(columns: Column[], row: string[], columnName: string): string {
        const index = columns.findIndex((c) => c.name === columnName);

        return index > -1 && row !== undefined && row.length > index ? row[columns.findIndex((c) => c.name === columnName)] : undefined;
    }

    private async getAvailabilityTestConfig(): Promise<AvailabilityTestConfig> {
        return this.serviceConfig.getConfigValue('availabilityTestConfig');
    }
}
