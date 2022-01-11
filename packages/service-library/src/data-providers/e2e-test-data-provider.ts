// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from 'stream';
import { BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as ApiContracts from 'api-contracts';
import { BodyParser, System } from 'common';

export type ReadErrorCode = 'blobNotFound' | 'jsonParseError' | 'streamError' | 'invalidFormat';

export type E2ETestDataError<ErrorCodeType> = {
    errorCode: ErrorCodeType;
    data?: string;
};

export type E2ETestDataReadResponse<T> = {
    error?: E2ETestDataError<ReadErrorCode>;
    item?: T;
};

@injectable()
export class E2ETestDataProvider {
    private readonly e2eTestDataContainerName = 'e2e-test-data';

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(BodyParser) private readonly bodyParser: BodyParser,
        private readonly isValidWebsiteObject: ApiContracts.ApiObjectValidator<ApiContracts.Website> = ApiContracts.isValidWebsiteObject,
    ) {}

    public async readTestWebsite(blobName: string): Promise<E2ETestDataReadResponse<ApiContracts.Website>> {
        const downloadResponse = await this.blobStorageClient.getBlobContent(this.e2eTestDataContainerName, blobName);

        if (downloadResponse.notFound) {
            return {
                error: { errorCode: 'blobNotFound' },
            };
        }

        let contentString: string;
        try {
            contentString = (await this.bodyParser.getRawBody(downloadResponse.content as Readable)).toString();
        } catch (error) {
            return {
                error: {
                    errorCode: 'streamError',
                    data: System.serializeError(error),
                },
            };
        }

        let testWebsite: ApiContracts.Website;
        try {
            testWebsite = JSON.parse(contentString);
        } catch (error) {
            return {
                error: {
                    errorCode: 'jsonParseError',
                    data: System.serializeError(error),
                },
            };
        }

        if (this.isValidWebsiteObject(testWebsite)) {
            return {
                item: testWebsite,
            };
        } else {
            return {
                error: {
                    errorCode: 'invalidFormat',
                    data: `Object is not a valid website object: ${contentString}`,
                },
            };
        }
    }
}
