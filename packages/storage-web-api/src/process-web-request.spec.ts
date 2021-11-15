// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { ApiController, WebRequestValidator } from 'service-library';
import { inject } from 'inversify';
import { processWebRequest } from './process-web-request';

/* eslint-disable @typescript-eslint/no-explicit-any */

type TestRequestResponse = {
    message: string;
    controller: TestableApiController;
};

class TestableApiController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'test api name';

    protected readonly serviceConfig: ServiceConfiguration;

    public constructor(
        @inject(ContextAwareLogger) public readonly logger: ContextAwareLogger,
        public readonly requestValidator: WebRequestValidator = {
            validateRequest: async (context: Context) => true,
        },
    ) {
        super(logger, requestValidator);
    }

    protected async handleRequest(...args: any[]): Promise<TestRequestResponse> {
        return {
            message: `request handled with args ${args.toString()}`,
            controller: this,
        };
    }
}

describe(processWebRequest, () => {
    let context: Context;

    beforeEach(() => {
        context = {
            req: {
                query: { 'api-version': '1.0' },
            },
        } as unknown as Context;
        process.env.APPINSIGHTS_DISABLED = 'true';
    });

    afterEach(() => {
        delete process.env.APPINSIGHTS_DISABLED;
    });

    it('returns response from controller', async () => {
        const args = ['arg1', 'arg2'];

        const response = (await processWebRequest(context, TestableApiController, args)) as TestRequestResponse;

        expect(response.message).toBe(`request handled with args ${args.toString()}`);
    }, 10000);

    it('new loggers are created for each request', async () => {
        const args = ['arg1', 'arg2'];

        const response1 = (await processWebRequest(context, TestableApiController, args)) as TestRequestResponse;
        expect(response1.controller).toBeDefined();
        const logger1 = response1.controller.logger;

        const response2 = (await processWebRequest(context, TestableApiController, args)) as TestRequestResponse;
        expect(response2.controller).toBeDefined();
        const logger2 = response2.controller.logger;

        expect(logger1).toBeDefined();
        expect(logger2).toBeDefined();
        expect(logger1).not.toBe(logger2);
    }, 10000);
});
