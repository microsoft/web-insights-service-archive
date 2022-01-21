// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { Context } from '@azure/functions';
import { ApplicationInsightsClient, ApplicationInsightsQueryResponse } from 'azure-services';
import { AvailabilityTestConfig, ResponseWithBodyType, ServiceConfiguration } from 'common';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import { IMock, It, Mock } from 'typemoq';
import { ContextAwareLogger } from 'logger';
import { WebApiConfig } from '../web-api-config';
import { GetHealthReportRequestValidator } from '../request-validators/get-health-report-request-validator';
import { HealthCheckQueryFactories } from '../health-check-queries';
import { QueryResponseToHealthReportConverter } from '../converters/query-response-to-health-report-converter';
import { GetHealthReportController, HealthTarget } from './get-health-report-controller';

describe(GetHealthReportController, () => {
    const releaseTarget: HealthTarget = 'release';
    const releaseId = '2419';
    const testResultsQueryString = 'query for test results';
    const availabilityResultsQueryString = 'query for availability';
    const testResultsQueryResult = {
        tables: [
            {
                columns: [{ name: 'testName', type: 'dynamic' }],
                rows: [['Test']],
            },
        ],
    } as ApplicationInsightsQueryResponse;
    const availabilityResultsQueryResult = {
        tables: [
            {
                columns: [{ name: 'success', type: 'boolean' }],
                rows: [[true]],
            },
        ],
    } as ApplicationInsightsQueryResponse;
    const healthReport = { healthStatus: 'pass' } as ApiContracts.HealthReport;
    let healthCheckController: GetHealthReportController;
    let context: Context;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<ContextAwareLogger>;
    let appInsightsClientMock: IMock<ApplicationInsightsClient>;
    let availabilityTestConfig: AvailabilityTestConfig;
    let queryFactoriesStub: HealthCheckQueryFactories;
    let createTestResultsQueryMock: IMock<(releaseId: string) => string>;
    let createAvailabilityResultsQueryMock: IMock<(releaseId: string) => string>;
    let requestValidatorMock: IMock<GetHealthReportRequestValidator>;
    let createHealthReportMock: IMock<QueryResponseToHealthReportConverter>;

    beforeEach(() => {
        context = <Context>(<unknown>{
            req: {
                method: 'GET',
                headers: {},
                rawBody: ``,
                query: {},
            },
            bindingData: {},
        });

        availabilityTestConfig = {
            logQueryTimeRange: 'P1D',
            environmentDefinition: 'canary',
        };

        const webApiConfig: WebApiConfig = {
            releaseId: releaseId,
        };

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async (s) => s.getConfigValue('availabilityTestConfig'))
            .returns(async () => Promise.resolve(availabilityTestConfig));

        loggerMock = Mock.ofType<ContextAwareLogger>();
        appInsightsClientMock = Mock.ofType(ApplicationInsightsClient);

        createTestResultsQueryMock = Mock.ofType<(releaseId: string) => string>();
        createTestResultsQueryMock.setup((c) => c(releaseId)).returns(() => testResultsQueryString);

        createAvailabilityResultsQueryMock = Mock.ofType<(releaseId: string) => string>();
        createAvailabilityResultsQueryMock.setup((c) => c(releaseId)).returns(() => availabilityResultsQueryString);

        createHealthReportMock = Mock.ofType<QueryResponseToHealthReportConverter>();
        createHealthReportMock.setup((c) => c(testResultsQueryResult, availabilityResultsQueryResult)).returns(() => healthReport);

        queryFactoriesStub = {
            createTestResultsQueryForRelease: createTestResultsQueryMock.object,
            createAvailabilityResultsQueryForRelease: createAvailabilityResultsQueryMock.object,
        };

        requestValidatorMock = Mock.ofType<GetHealthReportRequestValidator>();

        healthCheckController = new GetHealthReportController(
            serviceConfigurationMock.object,
            loggerMock.object,
            async () => Promise.resolve(appInsightsClientMock.object),
            webApiConfig,
            requestValidatorMock.object,
            queryFactoriesStub,
            createHealthReportMock.object,
        );
        healthCheckController.context = context;
    });

    it('return echo health request', async () => {
        await healthCheckController.handleRequest();

        expect(context.res).toEqual({ status: 200 });
        loggerMock.verifyAll();
    });

    it('return internal error on app insights failure for test results query', async () => {
        context.bindingData.target = releaseTarget;
        setupFailedAppInsightsQuery(testResultsQueryString);
        setupSuccessfulAppInsightsQuery(availabilityResultsQueryResult, availabilityResultsQueryString);

        await healthCheckController.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.internalError));
        appInsightsClientMock.verifyAll();
    });

    it('return internal error on app insights failure for availability results query', async () => {
        context.bindingData.target = releaseTarget;
        setupFailedAppInsightsQuery(availabilityResultsQueryString);
        setupSuccessfulAppInsightsQuery(testResultsQueryResult, testResultsQueryString);

        await healthCheckController.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.internalError));
        appInsightsClientMock.verifyAll();
    });

    it('returns correct health report', async () => {
        context.bindingData.target = releaseTarget;
        context.bindingData.targetId = releaseId;
        setupSuccessfulAppInsightsQuery(testResultsQueryResult, testResultsQueryString);
        setupSuccessfulAppInsightsQuery(availabilityResultsQueryResult, availabilityResultsQueryString);

        await healthCheckController.handleRequest();

        expect(context.res.status).toEqual(200);
        expect(context.res.body).toEqual(healthReport);
        appInsightsClientMock.verifyAll();
    });

    function setupFailedAppInsightsQuery(query: string): void {
        const response = {
            body: undefined,
            statusCode: 400,
        } as ResponseWithBodyType<ApplicationInsightsQueryResponse>;

        appInsightsClientMock
            .setup(async (a) => a.executeQuery(query, It.isAny()))
            .returns(async () => response)
            .verifiable();
    }

    function setupSuccessfulAppInsightsQuery(responseBody: ApplicationInsightsQueryResponse, query: string): void {
        const response = {
            body: responseBody,
            statusCode: 200,
        } as ResponseWithBodyType<ApplicationInsightsQueryResponse>;

        appInsightsClientMock
            .setup(async (a) => a.executeQuery(query, It.isAny()))
            .returns(async () => response)
            .verifiable();
    }
});
