// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { SqlQuerySpec } from '@azure/cosmos';
import _ from 'lodash';

export class CosmosQueryResultsIterable<T> implements AsyncIterable<T> {
    constructor(private readonly cosmosContainerClient: CosmosContainerClient, private readonly query: string | SqlQuerySpec) {}

    public [Symbol.asyncIterator](): AsyncIterator<T> {
        return this.queryCosmosDbGenerator();
    }

    private async *queryCosmosDbGenerator(): AsyncGenerator<T, unknown, undefined> {
        let continuationToken;
        do {
            const response: CosmosOperationResponse<T[]> = await this.cosmosContainerClient.queryDocuments<T>(
                this.query,
                continuationToken,
            );
            client.ensureSuccessStatusCode(response);
            continuationToken = response.continuationToken;
            yield* response.item;
        } while (continuationToken !== undefined);

        return undefined;
    }
}

export function getCosmosQueryResultsIterable<T>(
    cosmosContainerClient: CosmosContainerClient,
    query: string | SqlQuerySpec,
): CosmosQueryResultsIterable<T> {
    return new CosmosQueryResultsIterable<T>(cosmosContainerClient, query);
}
