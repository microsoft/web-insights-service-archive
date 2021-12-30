// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TestDefinition, TestEnvironment, TestFunction } from './common-types';
import { FunctionalTestGroup } from './functional-test-group';

export const definedTestsMetadataKey = Symbol('definedTests');
type TestFunctionDescriptor = TypedPropertyDescriptor<TestFunction>;

export function getDefinedTestsMetadata(target: FunctionalTestGroup): TestDefinition[] {
    const metadata = Reflect.getMetadata(definedTestsMetadataKey, target.constructor) as TestDefinition[];

    return metadata === undefined ? [] : metadata;
}

export function test(
    environments: TestEnvironment,
): (target: FunctionalTestGroup, propertyKey: string, descriptor: TestFunctionDescriptor) => TestFunctionDescriptor {
    return (target: FunctionalTestGroup, propertyKey: string, descriptor: TestFunctionDescriptor): TestFunctionDescriptor => {
        const metadata = getDefinedTestsMetadata(target);
        metadata.push({
            testContainer: target.constructor.name,
            testName: propertyKey,
            environments: environments,
            testImplFunc: descriptor.value,
        });
        Reflect.defineMetadata(definedTestsMetadataKey, metadata, target.constructor);

        return descriptor;
    };
}
