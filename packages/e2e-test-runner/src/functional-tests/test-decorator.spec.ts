// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TestDefinition, TestEnvironment } from './common-types';
import { FunctionalTestGroup } from './functional-test-group';
import { TestContextData } from './test-context-data';
import { definedTestsMetadataKey, test } from './test-decorator';

class TestGroupStub extends FunctionalTestGroup {
    constructor() {
        super(undefined, undefined, undefined, undefined);
    }

    public testA(): void {
        console.log('Invoked test A');
    }

    @test(TestEnvironment.all)
    public async testB(_: TestContextData): Promise<void> {
        console.log('Invoked test B');
    }

    @test(TestEnvironment.canary)
    public async testC(_: TestContextData): Promise<void> {
        console.log('Invoked test C');
    }
}

describe(test, () => {
    it('should process method decorator', () => {
        const testsCount = 2;
        const target = new TestGroupStub();
        const metadata = Reflect.getMetadata(definedTestsMetadataKey, target.constructor) as TestDefinition[];
        expect(metadata.length).toEqual(testsCount);
        expect({
            testContainer: target.constructor.name,
            testName: 'testB',
            environments: TestEnvironment.all,
            testImplFunc: target.testB,
        }).toEqual(metadata[0]);
        expect({
            testContainer: target.constructor.name,
            testName: 'testC',
            environments: TestEnvironment.canary,
            testImplFunc: target.testC,
        }).toEqual(metadata[1]);
    });
});
