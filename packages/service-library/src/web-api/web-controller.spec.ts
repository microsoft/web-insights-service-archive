// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { System } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { Container } from 'inversify';
import { authorize } from 'azure-services';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { WebController } from './web-controller';
import { WebRequestValidator } from './web-request-validator';
import { WebControllerAuth } from './web-controller-auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

const aclName = 'aclName';
const invocationId = 'test-invocation-id';

@authorize(aclName)
export class TestableWebController extends WebController {
    public static readonly handleRequestResponse = 'handle-request-response';

    public readonly apiVersion = '1.0';

    public readonly apiName = 'controller-mock-api';

    public handleRequestInvoked = false;

    public requestArgs: any[];

    public getBaseTelemetryProperties(): { [name: string]: string } {
        return super.getBaseTelemetryProperties();
    }

    protected async handleRequest(): Promise<unknown> {
        this.handleRequestInvoked = true;

        return TestableWebController.handleRequestResponse;
    }
}

let context: Context;
let testSubject: TestableWebController;
let containerMock: IMock<Container>;
let loggerMock: IMock<MockableLogger>;
let requestValidatorMock: IMock<WebRequestValidator>;
let webControllerAuthMock: IMock<WebControllerAuth>;

describe(WebController, () => {
    beforeEach(() => {
        context = <Context>(<unknown>{ bindingDefinitions: {}, res: {}, invocationId: invocationId });
        containerMock = Mock.ofType(Container);
        loggerMock = Mock.ofType(MockableLogger);
        webControllerAuthMock = Mock.ofType(WebControllerAuth);
        requestValidatorMock = Mock.ofInstance({ validateRequest: async () => true });

        webControllerAuthMock
            .setup((o) => o.authorize(context, aclName))
            .returns(() => Promise.resolve(true))
            .verifiable();
        containerMock
            .setup((o) => o.get(WebControllerAuth))
            .returns(() => webControllerAuthMock.object)
            .verifiable();
        requestValidatorMock
            .setup((v) => v.validateRequest(context))
            .returns(async () => true)
            .verifiable();
        loggerMock
            .setup((l) => l.setCommonProperties(It.isAny()))
            .returns(() => Promise.resolve(undefined))
            .verifiable();

        testSubject = new TestableWebController(loggerMock.object, requestValidatorMock.object);
    });

    afterEach(() => {
        containerMock.verifyAll();
        loggerMock.verifyAll();
        requestValidatorMock.verifyAll();
        webControllerAuthMock.verifyAll();
    });

    it('should setup context aware logger', async () => {
        loggerMock.reset();
        loggerMock
            .setup((l) =>
                l.setCommonProperties(
                    It.isValue({
                        apiName: testSubject.apiName,
                        apiVersion: testSubject.apiVersion,
                        controller: 'TestableWebController',
                        invocationId,
                    }),
                ),
            )
            .verifiable(Times.once());

        await testSubject.invoke(context, containerMock.object, 'valid');
    });

    it('should not handle request if request is invalid', async () => {
        requestValidatorMock.reset();
        requestValidatorMock
            .setup((v) => v.validateRequest(context))
            .returns(async () => false)
            .verifiable();
        await testSubject.invoke(context, containerMock.object);
        expect(testSubject.handleRequestInvoked).toEqual(false);
    });

    it('should handle request if request is valid', async () => {
        await testSubject.invoke(context, containerMock.object);
        expect(testSubject.handleRequestInvoked).toEqual(true);
    });

    it('should add content-type response header if no any', async () => {
        await testSubject.invoke(context, containerMock.object);
        expect(testSubject.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
        expect(testSubject.context.res.headers['X-Content-Type-Options']).toEqual('nosniff');
    });

    it('should add content-type response header if other', async () => {
        context.res.headers = {
            'content-length': 100,
        };
        setupWithContext();
        await testSubject.invoke(context, containerMock.object);
        expect(testSubject.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
        expect(testSubject.context.res.headers['X-Content-Type-Options']).toEqual('nosniff');
    });

    it('should skip adding content-type response header if any', async () => {
        context.res.headers = {
            'content-type': 'text/plain',
        };
        setupWithContext();
        await testSubject.invoke(context, containerMock.object);
        expect(testSubject.context.res.headers['content-type']).toEqual('text/plain');
    });

    it('verifies base telemetry properties', async () => {
        context.res.headers = {
            'content-type': 'text/plain',
        };
        setupWithContext();
        await testSubject.invoke(context, containerMock.object);
        expect(testSubject.getBaseTelemetryProperties()).toEqual({
            apiName: testSubject.apiName,
            apiVersion: testSubject.apiVersion,
            controller: 'TestableWebController',
            invocationId,
        });
    });

    it('returns handleRequest result', async () => {
        await expect(testSubject.invoke(context, containerMock.object)).resolves.toBe(TestableWebController.handleRequestResponse);
    });

    it('should reject if client is unauthorized', async () => {
        requestValidatorMock.reset();
        webControllerAuthMock.reset();
        webControllerAuthMock
            .setup((o) => o.authorize(context, aclName))
            .returns(() => Promise.resolve(false))
            .verifiable();
        await testSubject.invoke(context, containerMock.object);
    });

    it('should skip authorization if there is no class decorator', async () => {
        webControllerAuthMock.reset();
        containerMock.reset();
        Reflect.defineMetadata('authorize', false, testSubject.constructor);
        await testSubject.invoke(context, containerMock.object);
    });

    it('log exception', async () => {
        const error = new Error('Logger.setCommonProperties() exception.');
        containerMock.reset();
        requestValidatorMock.reset();
        webControllerAuthMock.reset();
        loggerMock.reset();
        loggerMock
            .setup((o) => {
                o.setCommonProperties(It.isAny());
            })
            .throws(error)
            .verifiable();

        loggerMock
            .setup((o) => {
                o.logError('Encountered an error while processing HTTP web request.', { error: System.serializeError(error) });
            })
            .verifiable();

        await expect(testSubject.invoke(context, containerMock.object)).rejects.toEqual(error);
    });
});

function setupWithContext(): void {
    webControllerAuthMock.reset();
    webControllerAuthMock
        .setup((o) => o.authorize(context, aclName))
        .returns(() => Promise.resolve(true))
        .verifiable();
    requestValidatorMock.reset();
    requestValidatorMock
        .setup((v) => v.validateRequest(context))
        .returns(async () => true)
        .verifiable();
}
