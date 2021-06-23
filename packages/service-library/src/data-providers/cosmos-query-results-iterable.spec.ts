// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { IMock, It, Mock } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

type TestDocument = {
    name: string;
};

describe(CosmosQueryResultsIterable, () => {
    const query = 'test query';
    const testDocuments: TestDocument[] = [{ name: 'test document 1' }, { name: 'test document 2' }, { name: 'test document 3' }];
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;

    let queryResults: CosmosQueryResultsIterable<TestDocument>;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        queryResults = getCosmosQueryResultsIterable(cosmosContainerClientMock.object, query);
    });

    it('factory returns an AsyncIterable', () => {
        expect(getCosmosQueryResultsIterable(cosmosContainerClientMock.object, query)).toHaveProperty([Symbol.asyncIterator]);
    });

    it('Throws if the query fails', () => {
        const response: CosmosOperationResponse<TestDocument[]> = { statusCode: 400 };
        cosmosContainerClientMock.setup((c) => c.queryDocuments(It.isAny(), It.isAny())).returns(async () => response);
        const iterator = queryResults[Symbol.asyncIterator]();

        expect(iterator.next()).rejects.toThrow();
    });

    it('Returns all items from query', async () => {
        const response: CosmosOperationResponse<TestDocument[]> = {
            statusCode: 200,
            item: testDocuments,
        };

        const results = [];
        cosmosContainerClientMock.setup((c) => c.queryDocuments(query, undefined)).returns(async () => response);

        for await (const item of queryResults) {
            results.push(item);
        }

        expect(results).toEqual(testDocuments);
    });

    it('Returns all items from paginated results', async () => {
        const continuationToken = 'continuation token';
        const splitIndex = 1;
        const response1: CosmosOperationResponse<TestDocument[]> = {
            statusCode: 200,
            item: testDocuments.slice(0, splitIndex),
            continuationToken: continuationToken,
        };
        const response2: CosmosOperationResponse<TestDocument[]> = {
            statusCode: 200,
            item: testDocuments.slice(splitIndex, testDocuments.length),
        };

        const results = [];
        cosmosContainerClientMock.setup((c) => c.queryDocuments(query, undefined)).returns(async () => response1);
        cosmosContainerClientMock.setup((c) => c.queryDocuments(query, continuationToken)).returns(async () => response2);

        for await (const item of queryResults) {
            results.push(item);
        }

        expect(results).toEqual(testDocuments);
    });
});
