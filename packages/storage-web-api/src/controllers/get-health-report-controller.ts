// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ApplicationInsightsClientProvider, ApplicationInsightsQueryResponse, authorize, AzureServicesIocTypes } from 'azure-services';
import { AvailabilityTestConfig, getSerializableResponse, ResponseWithBodyType, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ApiController, HttpResponse, WebApiErrorCodes } from 'service-library';
import { createHealthReport, QueryResponseToHealthReportConverter } from '../converters/query-response-to-health-report-converter';
import { healthCheckQueryFactories } from '../health-check-queries';
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
        protected readonly queryFactories: typeof healthCheckQueryFactories = healthCheckQueryFactories,
        protected readonly convertQueriesToHealthReport: QueryResponseToHealthReportConverter = createHealthReport,
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

        const testResultsQueryPromise = this.executeAppInsightsQuery(this.queryFactories.createTestResultsQueryForRelease(releaseId));
        const availabilityResultsQueryPromise = this.executeAppInsightsQuery(
            this.queryFactories.createAvailabilityResultsQueryForRelease(releaseId),
        );
        const testResultsResponse = await testResultsQueryPromise;
        const availabilityResultsResponse = await availabilityResultsQueryPromise;
        if (testResultsResponse.statusCode !== 200 || availabilityResultsResponse.statusCode !== 200) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);

            return;
        }

        const healthReport = this.convertQueriesToHealthReport(testResultsResponse.body, availabilityResultsResponse.body);

        this.context.res = {
            status: 200, // OK
            body: healthReport,
        };
    }

    private async executeAppInsightsQuery(queryString: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const appInsightsClient = await this.appInsightsClientProvider();
        const logQueryTimeRange = (await this.getAvailabilityTestConfig()).logQueryTimeRange;
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

    private processEchoHealthRequest(): void {
        this.context.res = {
            status: 200, // OK
        };
    }

    private async getAvailabilityTestConfig(): Promise<AvailabilityTestConfig> {
        return this.serviceConfig.getConfigValue('availabilityTestConfig');
    }
}
