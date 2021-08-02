// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { IMock, Mock } from 'typemoq';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import * as cronParser from 'cron-parser';
import { Context } from '@azure/functions';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import { SubmitWebsiteScanRequestValidator } from './submit-website-scan-request-validator';

describe(SubmitWebsiteScanRequestValidator, () => {
    const restApiConfig = {
        maxScanPriorityValue: 1000,
        minScanPriorityValue: -1000,
    } as RestApiConfig;

    let websiteScanRequest: ApiContracts.WebsiteScanRequest;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let isValidWebsiteScanRequestMock: IMock<typeof ApiContracts.isValidWebsiteScanRequestObject>;
    let cronParserMock: IMock<typeof cronParser>;

    let testSubject: SubmitWebsiteScanRequestValidator;

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        isValidWebsiteScanRequestMock = Mock.ofInstance(() => null);
        cronParserMock = Mock.ofInstance(cronParser);

        serviceConfigMock.setup((sc) => sc.getConfigValue('restApiConfig')).returns(async () => restApiConfig);

        websiteScanRequest = {
            websiteId: 'website id',
            scanType: 'a11y',
        };

        testSubject = new SubmitWebsiteScanRequestValidator(
            guidGeneratorMock.object,
            serviceConfigMock.object,
            isValidWebsiteScanRequestMock.object,
            cronParserMock.object,
        );
    });

    it('rejects request with invalid api version', async () => {
        const context = createRequestContext('2.0');
        expect(await testSubject.validateRequest(context)).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('rejects invalid website scan request object', async () => {
        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => false);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);

        const context = createRequestContext();
        expect(await testSubject.validateRequest(context)).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
    });

    it('rejects website scan request with invalid website guid', async () => {
        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => false);

        const context = createRequestContext();
        expect(await testSubject.validateRequest(context)).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('rejects website scan request with invalid cron expression', async () => {
        const scanFrequency = 'invalid cron expression';
        websiteScanRequest.scanFrequency = scanFrequency;

        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);
        cronParserMock.setup((p) => p.parseExpression(scanFrequency)).throws(new Error('test error'));

        const context = createRequestContext();
        expect(await testSubject.validateRequest(context)).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidFrequencyExpression));
    });

    it.each([restApiConfig.maxScanPriorityValue + 1, restApiConfig.minScanPriorityValue - 1])(
        'rejects website scan request with invalid priority=%s',
        async (priority) => {
            websiteScanRequest.priority = priority;

            isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
            guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);

            const context = createRequestContext();
            expect(await testSubject.validateRequest(context)).toBeFalsy();
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.outOfRangePriority));
        },
    );

    it('accepts website scan request with valid guid and no specified frequency or priority', async () => {
        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);

        const context = createRequestContext();
        expect(await testSubject.validateRequest(context)).toBeTruthy();
    });

    it('accepts website scan request with valid guid and valid frequency expression', async () => {
        const scanFrequency = 'valid cron expression';
        websiteScanRequest.scanFrequency = scanFrequency;

        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);
        cronParserMock.setup((p) => p.parseExpression(scanFrequency)).verifiable();

        const context = createRequestContext();
        expect(await testSubject.validateRequest(context)).toBeTruthy();

        cronParserMock.verifyAll();
    });

    it.each([restApiConfig.maxScanPriorityValue, restApiConfig.minScanPriorityValue, 0])(
        'accepts website scan request with valid guid and valid priority=%s',
        async (priority) => {
            websiteScanRequest.priority = priority;

            isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
            guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);

            const context = createRequestContext();
            expect(await testSubject.validateRequest(context)).toBeTruthy();
        },
    );

    function createRequestContext(apiVersion: string = '1.0'): Context {
        return <Context>(<unknown>{
            req: {
                url: 'baseUrl/scans/websites',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                query: {
                    'api-version': apiVersion,
                },
                rawBody: JSON.stringify(websiteScanRequest),
            },
        });
    }
});
