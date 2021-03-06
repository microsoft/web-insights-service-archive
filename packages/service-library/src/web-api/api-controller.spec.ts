// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { Container } from 'inversify';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ApiController } from './api-controller';
import { HttpResponse } from './http-response';
import { WebApiErrorCodes } from './web-api-error-codes';
import { WebRequestValidator } from './web-request-validator';

/* eslint-disable @typescript-eslint/no-explicit-any */

class TestableApiController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'web-api-test';

    public handleRequestInvoked = false;

    public args: any[];

    public constructor(
        logger: Logger,
        requestValidator: WebRequestValidator,
        public requestContext: Context = null,
        public readonly serviceConfig: ServiceConfiguration = null,
    ) {
        super(logger, requestValidator);
        this.context = requestContext;
    }

    public async handleRequest(...requestArgs: any[]): Promise<void> {
        this.handleRequestInvoked = true;
        this.args = requestArgs;
    }

    public async getRestApiConfig(): Promise<RestApiConfig> {
        return super.getRestApiConfig();
    }
}

describe(ApiController, () => {
    let isValidRequest: boolean;
    let loggerMock: IMock<MockableLogger>;
    let containerMock: IMock<Container>;
    const requestValidatorStub: WebRequestValidator = {
        validateRequest: async () => isValidRequest,
    };

    beforeEach(() => {
        isValidRequest = true;
        loggerMock = Mock.ofType(MockableLogger);
        containerMock = Mock.ofType(Container);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        containerMock.verifyAll();
    });

    describe('hasPayload()', () => {
        it('should detect no payload in request', () => {
            const context = <Context>(<unknown>{
                req: {},
            });
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub, context);
            const valid = apiControllerMock.hasPayload();
            expect(valid).toEqual(false);
        });

        it('should detect empty payload in request', () => {
            const context = <Context>(<unknown>{
                req: {
                    rawBody: `[]`,
                },
            });
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub, context);
            const valid = apiControllerMock.hasPayload();

            expect(valid).toEqual(false);
        });

        it('should detect payload in request', () => {
            const context = <Context>(<unknown>{
                req: {
                    rawBody: `{ "id": "1" }`,
                },
            });
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub, context);
            const valid = apiControllerMock.hasPayload();
            expect(valid).toEqual(true);
        });
    });

    describe('invoke()', () => {
        it('should not handle invalid request', async () => {
            isValidRequest = false;
            const context = <Context>(<unknown>{
                req: {
                    method: 'POST',
                },
            });
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub);
            expect(apiControllerMock.context).toBeNull();
            await apiControllerMock.invoke(context, containerMock.object);
            expect(apiControllerMock.handleRequestInvoked).toEqual(false);
        });

        it('should handle valid request', async () => {
            const context = <Context>(<unknown>{
                req: {
                    method: 'POST',
                },
            });
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub);
            expect(apiControllerMock.context).toBeNull();
            await apiControllerMock.invoke(context, containerMock.object);
            expect(apiControllerMock.handleRequestInvoked).toEqual(true);
        });

        it('should pass request args', async () => {
            const context = <Context>(<unknown>{
                req: {
                    method: 'POST',
                    rawBody: `{ "id": "1" }`,
                    headers: {},
                    query: {},
                },
            });
            context.req.query['api-version'] = '1.0';
            context.req.headers['content-type'] = 'application/json';
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub);
            await apiControllerMock.invoke(context, containerMock.object, 'a', 1);
            expect(apiControllerMock.handleRequestInvoked).toEqual(true);
            expect(apiControllerMock.args).toEqual(['a', 1]);
        });
    });

    describe('tryGetPayload()', () => {
        interface PayloadType {
            id: number;
        }

        it('should detect invalid content', () => {
            const context = <Context>(<unknown>{
                req: {
                    rawBody: `{ "id": "1"`,
                },
            });
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub, context);
            const payload = apiControllerMock.tryGetPayload<PayloadType>();
            expect(payload).toEqual(undefined);
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidJsonDocument));
        });

        it('should parse valid content', () => {
            const context = <Context>(<unknown>{
                req: {
                    rawBody: `{ "id": "1" }`,
                },
            });
            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub, context);
            const payload = apiControllerMock.tryGetPayload<PayloadType>();
            expect(payload).toEqual({ id: '1' });
        });
    });

    describe('getRestApiConfig()', () => {
        it('should get config value', async () => {
            const context = <Context>(<unknown>{});
            const configStub = {
                minScanPriorityValue: -1,
                maxScanPriorityValue: 1,
            } as RestApiConfig;

            const serviceConfigMock = Mock.ofType(ServiceConfiguration);
            serviceConfigMock
                .setup(async (sm) => sm.getConfigValue('restApiConfig'))
                .returns(async () => {
                    return Promise.resolve(configStub);
                })
                .verifiable(Times.once());

            const apiControllerMock = new TestableApiController(loggerMock.object, requestValidatorStub, context, serviceConfigMock.object);
            const actualConfig = await apiControllerMock.getRestApiConfig();

            expect(actualConfig).toEqual(configStub);
            serviceConfigMock.verifyAll();
        });
    });
});
