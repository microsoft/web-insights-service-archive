// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ApiContracts from 'api-contracts';
import * as StorageDocuments from 'storage-documents';
import { getForeverAgents, ResponseWithBodyType, RetryHelper, System } from 'common';
import { injectable } from 'inversify';
import { Logger } from 'logger';
import got, { Agents, ExtendOptions, Got, Options } from 'got';
import { WebInsightsAPICredential } from './web-insights-api-credential';

@injectable()
export class WebInsightsStorageClient {
    private readonly baseRequestObj: Got;

    constructor(
        private readonly baseUrl: string,
        private readonly credential: WebInsightsAPICredential,
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
        const options: Options = {
            json: website,
        };

        const executeRequest = async () => (await this.signRequest()).post(requestUrl, options);
        const onRetry = async (e: Error) =>
            this.logger.logError('POST website REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.Website>(executeRequest, onRetry);
    }

    public async getWebsite(websiteId: string): Promise<ResponseWithBodyType<ApiContracts.Website>> {
        const requestUrl = `${this.baseUrl}/websites/${websiteId}`;

        const executeRequest = async () => (await this.signRequest()).get(requestUrl);
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

        const executeRequest = async () => (await this.signRequest()).post(requestUrl, options);
        const onRetry = async (e: Error) =>
            this.logger.logError('POST page REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.Page>(executeRequest, onRetry);
    }

    public async postWebsiteScan(websiteScan: ApiContracts.WebsiteScanRequest): Promise<ResponseWithBodyType<ApiContracts.WebsiteScan>> {
        const requestUrl = `${this.baseUrl}/websites/scans`;
        const options: Options = { json: websiteScan };

        const executeRequest = async () => (await this.signRequest()).post(requestUrl, options);
        const onRetry = async (e: Error) =>
            this.logger.logError('POST website scan REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.WebsiteScan>(executeRequest, onRetry);
    }

    public async getWebsiteScan(
        websiteId: string,
        scanType: StorageDocuments.ScanType,
        websiteScanId: string,
    ): Promise<ResponseWithBodyType<ApiContracts.WebsiteScan>> {
        return this.getWebsiteImpl(websiteId, scanType, websiteScanId);
    }

    public async getLatestWebsiteScan(
        websiteId: string,
        scanType: StorageDocuments.ScanType,
    ): Promise<ResponseWithBodyType<ApiContracts.WebsiteScan>> {
        return this.getWebsiteImpl(websiteId, scanType);
    }

    public async pingHealth(): Promise<ResponseWithBodyType> {
        const requestUrl = `${this.baseUrl}/health`;

        const executeRequest = async () => (await this.signRequest()).get(requestUrl);
        const onRetry = async (e: Error) =>
            this.logger.logError('GET health ping REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries(executeRequest, onRetry);
    }

    public async getHealthReport(releaseId?: string): Promise<ResponseWithBodyType<ApiContracts.HealthReport>> {
        let requestUrl = `${this.baseUrl}/health/release`;
        if (releaseId) {
            requestUrl = `${requestUrl}/${releaseId}`;
        }

        const executeRequest = async () => (await this.signRequest()).get(requestUrl);
        const onRetry = async (e: Error) =>
            this.logger.logError('GET health report REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.HealthReport>(executeRequest, onRetry);
    }

    private async getWebsiteImpl(
        websiteId: string,
        scanType: StorageDocuments.ScanType,
        websiteScanId?: string,
    ): Promise<ResponseWithBodyType<ApiContracts.WebsiteScan>> {
        const latestScanTag = 'latest';
        const requestUrl = `${this.baseUrl}/websites/${websiteId}/scans/${scanType}/${websiteScanId ?? latestScanTag}`;

        const executeRequest = async () => (await this.signRequest()).get(requestUrl);
        const onRetry = async (e: Error) =>
            this.logger.logError('GET website scan REST API request failed. Retrying on error.', {
                url: requestUrl,
                error: System.serializeError(e),
            });

        return this.executeRequestWithRetries<ApiContracts.WebsiteScan>(executeRequest, onRetry);
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

    private async signRequest(): Promise<Got> {
        const accessToken = await this.credential.getToken();

        return this.baseRequestObj.extend({
            headers: {
                authorization: `${accessToken.tokenType} ${accessToken.accessToken}`,
            },
        });
    }
}
