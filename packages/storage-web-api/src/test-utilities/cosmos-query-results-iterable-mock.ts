// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosQueryResultsIterable } from 'service-library';
import { IMock, Mock } from 'typemoq';

export function mockCosmosQueryResults<T>(results: Promise<T>[]): IMock<CosmosQueryResultsIterable<T>> {
    const cosmosQueryResultsIterableMock = Mock.ofType<CosmosQueryResultsIterable<T>>();
    cosmosQueryResultsIterableMock
        .setup((c) => c[Symbol.asyncIterator])
        .returns(() => {
            return () => promiseListGenerator(results);
        });

    return cosmosQueryResultsIterableMock;
}

async function* promiseListGenerator<T>(promiseList: Promise<T>[]): AsyncGenerator<T, unknown, undefined> {
    for (const promise of promiseList) {
        yield await promise;
    }

    return undefined;
}
