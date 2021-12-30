// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Readable } from 'stream';
import * as ApiContracts from 'api-contracts';
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { BodyParser, System } from 'common';
import { IMock, It, Mock } from 'typemoq';
import { E2ETestDataProvider } from './e2e-test-data-provider';

describe(E2ETestDataProvider, () => {
    const containerName = 'e2e-test-data';
    const blobName = 'test-website.json';
    const readableStream = {
        readable: true,
    } as NodeJS.ReadableStream;
    const websiteStub = { id: 'website id' };
    const successfulReadResponse = { notFound: false, content: readableStream } as BlobContentDownloadResponse;

    let blobStorageClientMock: IMock<BlobStorageClient>;
    let bodyParserMock: IMock<BodyParser>;
    let isValidWebsiteObjectMock: IMock<ApiContracts.ApiObjectValidator<ApiContracts.Website>>;

    let testSubject: E2ETestDataProvider;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType<BlobStorageClient>();
        bodyParserMock = Mock.ofType<BodyParser>();
        isValidWebsiteObjectMock = Mock.ofType<ApiContracts.ApiObjectValidator<ApiContracts.Website>>();

        testSubject = new E2ETestDataProvider(blobStorageClientMock.object, bodyParserMock.object, isValidWebsiteObjectMock.object);
    });

    it('returns blobNotFound if storage client returns notFound', async () => {
        const storageReadResponse = { notFound: true } as BlobContentDownloadResponse;
        setupBlobRead(storageReadResponse);

        const result = await testSubject.readTestWebsite(blobName);

        expect(result.error).toEqual({ errorCode: 'blobNotFound' });
    });

    it('returns streamError if bodyParser fails', async () => {
        const testError = new Error('Test error');
        const expectedError = {
            errorCode: 'streamError',
            data: System.serializeError(testError),
        };
        setupBlobRead(successfulReadResponse);
        bodyParserMock.setup((b) => b.getRawBody(It.isAny())).throws(testError);

        const result = await testSubject.readTestWebsite(blobName);

        expect(result.error).toEqual(expectedError);
    });

    it('returns jsonParseError if JSON is invalid', async () => {
        const invalidJson = '';
        setupBlobRead(successfulReadResponse);
        setupParseBody(invalidJson);

        const result = await testSubject.readTestWebsite(blobName);

        expect(result.error?.errorCode).toEqual('jsonParseError');
        expect(result.error.data).toBeDefined();
    });

    it('returns invalidFormat if document is not a valid website object', async () => {
        const invalidWebsiteJson = JSON.stringify(websiteStub);
        const expectedError = {
            errorCode: 'invalidFormat',
            data: `Object is not a valid website object: ${invalidWebsiteJson}`,
        };
        setupBlobRead(successfulReadResponse);
        setupParseBody(invalidWebsiteJson);
        isValidWebsiteObjectMock.setup((x) => x(websiteStub as ApiContracts.Website)).returns(() => false);

        const result = await testSubject.readTestWebsite(blobName);

        expect(result.error).toEqual(expectedError);
    });

    it('successfully returns website if document is in correct format', async () => {
        const expectedResult = { item: websiteStub };
        setupBlobRead(successfulReadResponse);
        setupParseBody(JSON.stringify(websiteStub));
        isValidWebsiteObjectMock.setup((x) => x(websiteStub as ApiContracts.Website)).returns(() => true);

        const result = await testSubject.readTestWebsite(blobName);

        expect(result).toEqual(expectedResult);
    });

    function setupBlobRead(response: BlobContentDownloadResponse): void {
        blobStorageClientMock.setup((b) => b.getBlobContent(containerName, blobName)).returns(async () => response);
    }

    function setupParseBody(contentString: string): void {
        bodyParserMock.setup((b) => b.getRawBody(readableStream as Readable)).returns(async () => Buffer.from(contentString));
    }
});
