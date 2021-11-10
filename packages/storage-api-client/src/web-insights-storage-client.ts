// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import { getForeverAgents, ResponseWithBodyType, RetryHelper, System } from 'common';
import { injectable } from 'inversify';
import { Logger } from 'logger';
import got, { Agents, ExtendOptions, Got, Options } from 'got';

@injectable()
export class WebInsightsStorageClient {
    private readonly baseRequestObj: Got;

    constructor(
        private readonly baseUrl: string,
        private readonly logger: Logger,
        throwOnRequestFailure: boolean = false,
        apiVersion: string = '1.0',
        requestObj: Got = got,
        getAgents: () => Agents = getForeverAgents,
        private readonly retryHelper: RetryHelper<unknown> = new RetryHelper(),
        private readonly maxRetryCount: number = 5,
        private readonly msecBetweenRetries: number = 1000,
    ) {
        const defaultRequestOptions: ExtendOptions = {
            searchParams: {
                'api-version': apiVersion,
            },
            headers: {
                'Content-Type': 'application/json',
            },
            responseType: 'json',
            throwHttpErrors: throwOnRequestFailure,
            agent: getAgents(),
            https: {
                rejectUnauthorized: false, // Must be false because we use a self-signed cert
            },
        };

        this.baseRequestObj = requestObj.extend(defaultRequestOptions);
    }

    public async postWebsite(website: ApiContracts.Website): Promise<ResponseWithBodyType<ApiContracts.Website>> {
        const requestUrl = `${this.baseUrl}/websites`;
        const options: Options = { json: website };

        const executeRequest = async () => this.baseRequestObj.post(requestUrl, options);
        const onRetry = async (e: Error) =>
            this.logger.logError('POST website REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.Website>(executeRequest, onRetry);
    }

    public async getWebsite(websiteId: string): Promise<ResponseWithBodyType<ApiContracts.Website>> {
        const requestUrl = `${this.baseUrl}/websites/${websiteId}`;

        const executeRequest = async () => this.baseRequestObj.get(requestUrl);
        const onRetry = async (e: Error) =>
            this.logger.logError('GET website REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.Website>(executeRequest, onRetry);
    }

    public async postPage(pageUpdate: ApiContracts.PageUpdate): Promise<ResponseWithBodyType<ApiContracts.Page>> {
        const requestUrl = `${this.baseUrl}/pages`;
        const options: Options = { json: pageUpdate };

        const executeRequest = async () => this.baseRequestObj.post(requestUrl, options);
        const onRetry = async (e: Error) =>
            this.logger.logError('POST page REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.Page>(executeRequest, onRetry);
    }

    private async executeRequestWithRetries<T>(
        executeRequest: () => Promise<unknown>,
        onRetry: (e: Error) => Promise<void>,
    ): Promise<ResponseWithBodyType<T>> {
        return (await this.retryHelper.executeWithRetries(
            executeRequest,
            onRetry,
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as ResponseWithBodyType<T>;
    }
}
