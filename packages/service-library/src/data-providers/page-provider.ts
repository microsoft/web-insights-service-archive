// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { itemTypes, Page } from 'storage-documents';
import { GuidGenerator } from 'common';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

@injectable()
export class PageProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.websiteRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        private readonly cosmosQueryResultsProvider: typeof getCosmosQueryResultsIterable = getCosmosQueryResultsIterable,
    ) {}

    public async createPageForWebsite(pageUrl: string, websiteId: string): Promise<Page> {
        const pageDoc = this.normalizeDbDocument({
            id: this.guidGenerator.createGuidFromBaseGuid(websiteId),
            websiteId: websiteId,
            url: pageUrl,
        }) as Page;
        await this.cosmosContainerClient.writeDocument(pageDoc);

        return pageDoc;
    }

    public async deletePage(pageId: string): Promise<void> {
        await this.cosmosContainerClient.deleteDocument(pageId, this.getPagePartitionKey(pageId));
    }

    public async updatePage(page: Partial<Page>): Promise<Page> {
        const response = await this.cosmosContainerClient.mergeOrWriteDocument<Page>(this.normalizeDbDocument(page) as Page);

        return response.item;
    }

    public async readPage(id: string): Promise<Page> {
        const response = await this.cosmosContainerClient.readDocument<Page>(id, this.getPagePartitionKey(id));
        client.ensureSuccessStatusCode(response);

        return response.item;
    }

    public getPagesForWebsite(websiteId: string): CosmosQueryResultsIterable<Page> {
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
                    value: itemTypes.page,
                },
            ],
        };

        return this.cosmosQueryResultsProvider(this.cosmosContainerClient, query);
    }

    private getPagePartitionKey(pageOrWebsiteId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(itemTypes.page, pageOrWebsiteId);
    }

    private normalizeDbDocument(page: Partial<Page>): Partial<Page> {
        if (page.id === undefined) {
            throw new Error('Page document has no associated id');
        }

        return {
            itemType: itemTypes.page,
            partitionKey: this.getPagePartitionKey(page.id),
            ...page,
        };
    }
}
