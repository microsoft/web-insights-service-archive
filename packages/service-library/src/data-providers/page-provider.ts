// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { inject, injectable } from 'inversify';
import { Page } from 'storage-documents';
import { GuidGenerator } from 'common';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';

@injectable()
export class PageProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.websiteRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
    ) {}

    public async createPageForWebsite(pageUrl: string, websiteId: string): Promise<void> {
        const page = this.normalizeDbDocument({
            id: this.guidGenerator.createGuidFromBaseGuid(websiteId),
            websiteId: websiteId,
            url: pageUrl,
        });
        await this.cosmosContainerClient.writeDocument(page);
    }

    public async updatePage(page: Partial<Page>): Promise<void> {
        await this.cosmosContainerClient.mergeOrWriteDocument(this.normalizeDbDocument(page));
    }

    public async readPage(id: string): Promise<Page> {
        const response = await this.cosmosContainerClient.readDocument<Page>(id, this.getPagePartitionKey(id));
        client.ensureSuccessStatusCode(response);

        return response.item;
    }

    public async readAllPagesForWebsite(websiteId: string): Promise<Partial<Page>[]> {
        const partitionKey = this.getPagePartitionKey(websiteId);

        const query = {
            query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.websiteId = @websiteId and c.itemType = @itemType',
            parameters: [
                {
                    name: '@websiteId',
                    value: websiteId,
                },
                {
                    name: '@partitionKey',
                    value: partitionKey,
                },
                {
                    name: '@itemType',
                    value: 'page',
                },
            ],
        };

        const pageLists: Page[][] = [];
        let continuationToken;
        do {
            const response = (await this.cosmosContainerClient.queryDocuments<Page>(query, continuationToken)) as CosmosOperationResponse<
                Page[]
            >;

            client.ensureSuccessStatusCode(response);
            continuationToken = response.continuationToken;
            pageLists.push(response.item);
        } while (continuationToken !== undefined);

        return _.flatten(pageLists);
    }

    private getPagePartitionKey(pageOrWebsiteId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument('page', pageOrWebsiteId);
    }

    private normalizeDbDocument(page: Partial<Page>): Partial<Page> {
        if (page.id === undefined) {
            throw new Error('Page document has no associated id');
        }

        return {
            itemType: 'page',
            partitionKey: this.getPagePartitionKey(page.id),
            ...page,
        };
    }
}
