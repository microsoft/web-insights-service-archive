// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { getSerializableResponse, GuidGenerator, ResponseWithBodyType } from 'common';
import { WebApiErrorCode } from 'service-library';
import { WebInsightsStorageClient } from 'storage-api-client';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class FunctionalTestGroup {
    constructor(protected readonly webInsightsClient: WebInsightsStorageClient, protected readonly guidGenerator: GuidGenerator) {}

    public ensureResponseSuccessStatusCode(response: ResponseWithBodyType<unknown>, message?: string): void {
        const serializedResponse = JSON.stringify(getSerializableResponse(response));
        expect(response.statusCode >= 200 && response.statusCode <= 300, `${message} ${serializedResponse}`).to.be.true;
    }

    public expectWebApiErrorResponse(webApiErrorCode: WebApiErrorCode, response: ResponseWithBodyType<unknown>): void {
        const serializedResponse = JSON.stringify(getSerializableResponse(response));
        expect(response.statusCode, `Unexpected Web API response code. ${serializedResponse}`).to.be.equal(webApiErrorCode.statusCode);
    }
}
