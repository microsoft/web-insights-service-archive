// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { WebInsightsStorageClient } from 'storage-api-client';
import { IMock, Mock } from 'typemoq';
import { PageProvider, WebsiteProvider } from 'service-library';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { TestContainerFactory } from './test-container-factory';
import { FunctionalTestGroup } from './functional-test-group';

class TestGroupA extends FunctionalTestGroup {}

describe(TestContainerFactory, () => {
    let webInsightsClientMock: IMock<WebInsightsStorageClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let websiteProviderMock: IMock<WebsiteProvider>;
    let pageProviderMock: IMock<PageProvider>;

    let testSubject: TestContainerFactory;

    beforeEach(() => {
        webInsightsClientMock = Mock.ofType<WebInsightsStorageClient>();
        getPromisableDynamicMock(webInsightsClientMock);
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        websiteProviderMock = Mock.ofType<WebsiteProvider>();
        pageProviderMock = Mock.ofType<PageProvider>();

        testSubject = new TestContainerFactory(
            async () => webInsightsClientMock.object,
            guidGeneratorMock.object,
            websiteProviderMock.object,
            pageProviderMock.object,
        );
    });

    it('Creates a test group object', async () => {
        const testContainer = await testSubject.createTestContainer(TestGroupA);

        expect(testContainer).toBeInstanceOf(TestGroupA);
    });
});
