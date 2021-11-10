// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';
import { System } from 'common';
import { injectable, Container, unmanaged } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebRequestValidator } from './web-request-validator';
import { WebControllerAuth } from './web-controller-auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WebController {
    aclName?: string;
}

@injectable()
export abstract class WebController {
    public context: Context;

    public container: Container;

    constructor(
        @unmanaged() protected readonly logger: ContextAwareLogger,
        @unmanaged() protected readonly requestValidator: WebRequestValidator,
    ) {}

    public abstract readonly apiVersion: string;

    public abstract readonly apiName: string;

    public async invoke(requestContext: Context, container: Container, ...args: any[]): Promise<unknown> {
        this.context = requestContext;
        this.container = container;

        try {
            this.logger.setCommonProperties(this.getBaseTelemetryProperties());

            const authorized = await this.authorize();
            if (!authorized) {
                return;
            }

            let result: unknown;
            if (await this.requestValidator.validateRequest(this.context)) {
                result = await this.handleRequest(...args);
            }

            this.setResponseContentTypeHeader();

            return result;
        } catch (error) {
            this.logger.logError('Encountered an error while processing HTTP web request.', { error: System.serializeError(error) });
            throw error;
        }
    }

    protected abstract handleRequest(...args: any[]): Promise<unknown>;

    protected getBaseTelemetryProperties(): { [name: string]: string } {
        return {
            apiName: this.apiName,
            apiVersion: this.apiVersion,
            controller: this.constructor.name,
            invocationId: this.context.invocationId,
        };
    }

    private async authorize(): Promise<boolean> {
        // The ACL is defined by {@link authorize} class decorator
        const hasDecorator = Reflect.getMetadata('authorize', this.constructor);
        if (hasDecorator === true) {
            const webControllerAuth = this.container.get(WebControllerAuth);

            return webControllerAuth.authorize(this.context, this.aclName);
        }

        return true;
    }

    private setResponseContentTypeHeader(): void {
        if (this.context !== undefined && this.context.res !== undefined) {
            const jsonContentType = 'application/json; charset=utf-8';
            if (this.context.res.headers === undefined) {
                this.context.res.headers = {
                    'content-type': jsonContentType,
                    'X-Content-Type-Options': 'nosniff',
                };
            } else if (this.context.res.headers['content-type'] === undefined) {
                this.context.res.headers['content-type'] = jsonContentType;
                this.context.res.headers['X-Content-Type-Options'] = 'nosniff';
            }
        }
    }
}
