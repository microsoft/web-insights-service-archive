// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { authorize } from './authorize';

/* eslint-disable @typescript-eslint/no-explicit-any */

@authorize('aclName')
class TestClass {
    constructor(public readonly id: string = 'id') {}
}

let testClass: TestClass;

describe(authorize, () => {
    beforeEach(() => {
        testClass = new TestClass();
    });

    it('should define metadata', () => {
        const hasDecorator = Reflect.getMetadata('authorize', testClass.constructor);
        expect(hasDecorator).toEqual(true);
    });

    it('should preserve class name', () => {
        expect(testClass.constructor.name).toEqual('TestClass');
    });

    it('should extend class constructor', () => {
        expect(testClass.id).toEqual('id');
        expect((testClass as any).aclName).toEqual('aclName');
    });
});
