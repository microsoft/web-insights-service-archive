// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { WebInsightsStorageClient } from 'storage-api-client';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { TestContainerFactory } from './test-container-factory';
import { FunctionalTestGroup } from './functional-test-group';

class TestGroupA extends FunctionalTestGroup {}

describe(TestContainerFactory, () => {
    let webInsightsClientMock: IMock<WebInsightsStorageClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    let testSubject: TestContainerFactory;

    beforeEach(() => {
        webInsightsClientMock = Mock.ofType<WebInsightsStorageClient>();
        getPromisableDynamicMock(webInsightsClientMock);
        guidGeneratorMock = Mock.ofType<GuidGenerator>();

        testSubject = new TestContainerFactory(async () => webInsightsClientMock.object, guidGeneratorMock.object);
    });

    it('Creates a test group object', async () => {
        const testContainer = await testSubject.createTestContainer(TestGroupA);

        expect(testContainer).toBeInstanceOf(TestGroupA);
    });
});
