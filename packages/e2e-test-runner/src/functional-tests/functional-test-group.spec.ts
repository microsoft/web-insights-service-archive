// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { PageProvider, WebApiErrorCodes, WebsiteProvider } from 'service-library';
import { IMock, Mock } from 'typemoq';
import { WebInsightsStorageClient } from 'storage-api-client';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-explicit-any */

class FunctionalTestGroupStub extends FunctionalTestGroup {}

describe(FunctionalTestGroup, () => {
    let testSubject: FunctionalTestGroupStub;
    let webInsightsClientMock: IMock<WebInsightsStorageClient>;
    let websiteProviderMock: IMock<WebsiteProvider>;
    let pageProviderMock: IMock<PageProvider>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    beforeEach(() => {
        webInsightsClientMock = Mock.ofType(WebInsightsStorageClient);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        websiteProviderMock = Mock.ofType(WebsiteProvider);

        testSubject = new FunctionalTestGroupStub(
            webInsightsClientMock.object,
            guidGeneratorMock.object,
            websiteProviderMock.object,
            pageProviderMock.object,
        );
    });

    it('validate ensureResponseSuccessStatusCode()', async () => {
        testSubject.ensureResponseSuccessStatusCode({ statusCode: 204 } as any);

        let pass = false;
        try {
            testSubject.ensureResponseSuccessStatusCode({ statusCode: 404 } as any);
        } catch (error) {
            pass = true;
        }
        expect(pass).toBeTruthy();
    });

    it('validate expectWebApiErrorResponse()', async () => {
        testSubject.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, { statusCode: 404 } as any);

        let pass = false;
        try {
            testSubject.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, { statusCode: 200 } as any);
        } catch (error) {
            pass = true;
        }
        expect(pass).toBeTruthy();
    });
});
