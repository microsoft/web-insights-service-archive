// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { System } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { WebController } from './web-controller';
import { WebRequestValidator } from './web-request-validator';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

describe(WebController, () => {
    let context: Context;
    let testSubject: TestableWebController;
    const invocationId = 'test-invocation-id';
    let loggerMock: IMock<MockableLogger>;
    let requestValidatorMock: IMock<WebRequestValidator>;

    beforeEach(() => {
        context = <Context>(<unknown>{ bindingDefinitions: {}, res: {}, invocationId: invocationId });
        loggerMock = Mock.ofType(MockableLogger);
        requestValidatorMock = Mock.ofInstance({ validateRequest: () => true });
        requestValidatorMock.setup((v) => v.validateRequest(context)).returns(() => true);

        testSubject = new TestableWebController(loggerMock.object, requestValidatorMock.object);

        loggerMock.setup((l) => l.setCommonProperties(It.isAny())).returns(() => Promise.resolve(undefined));
    });

    afterEach(() => {
        loggerMock.verifyAll();
        requestValidatorMock.verifyAll();
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

        await testSubject.invoke(context, 'valid');
    });

    it('should not handle request if request is invalid', async () => {
        requestValidatorMock.reset();
        requestValidatorMock
            .setup((v) => v.validateRequest(context))
            .returns(() => false)
            .verifiable();
        await testSubject.invoke(context);
        expect(testSubject.handleRequestInvoked).toEqual(false);
    });

    it('should handle request if request is valid', async () => {
        await testSubject.invoke(context);
        expect(testSubject.handleRequestInvoked).toEqual(true);
    });

    it('should add content-type response header if no any', async () => {
        await testSubject.invoke(context);
        expect(testSubject.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
        expect(testSubject.context.res.headers['X-Content-Type-Options']).toEqual('nosniff');
    });

    it('should add content-type response header if if other', async () => {
        context.res.headers = {
            'content-length': 100,
        };
        await testSubject.invoke(context);
        expect(testSubject.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
        expect(testSubject.context.res.headers['X-Content-Type-Options']).toEqual('nosniff');
    });

    it('should skip adding content-type response header if any', async () => {
        context.res.headers = {
            'content-type': 'text/plain',
        };
        await testSubject.invoke(context);
        expect(testSubject.context.res.headers['content-type']).toEqual('text/plain');
    });

    it('verifies base telemetry properties', async () => {
        context.res.headers = {
            'content-type': 'text/plain',
        };
        await testSubject.invoke(context);

        expect(testSubject.getBaseTelemetryProperties()).toEqual({
            apiName: testSubject.apiName,
            apiVersion: testSubject.apiVersion,
            controller: 'TestableWebController',
            invocationId,
        });
    });

    it('returns handleRequest result', async () => {
        await expect(testSubject.invoke(context)).resolves.toBe(TestableWebController.handleRequestResponse);
    });

    it('log exception', async () => {
        const error = new Error('Logger.setCommonProperties() exception.');
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

        await expect(testSubject.invoke(context)).rejects.toEqual(error);
    });
});
