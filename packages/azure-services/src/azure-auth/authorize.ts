// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */

export function authorize(aclName: string): any {
    return function <T extends new (...args: any[]) => {}>(constructor: T): any {
        Reflect.defineMetadata('authorize', true, constructor);

        const ctor = class extends constructor {
            public readonly aclName = aclName;
        };
        Object.defineProperty(ctor, 'name', {
            get: () => constructor.name,
        });

        return ctor;
    };
}
