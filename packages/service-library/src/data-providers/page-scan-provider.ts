// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { DocumentDataOnly, itemTypes, PageScan } from 'storage-documents';
import { GuidGenerator } from 'common';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

@injectable()
export class PageScanProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.scanMetadataRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        private readonly cosmosQueryResultsProvider: typeof getCosmosQueryResultsIterable = getCosmosQueryResultsIterable,
    ) {}

    public async createPageScan(pageId: string, websiteScanId: string, priority: number): Promise<PageScan> {
        const pageScanData: DocumentDataOnly<PageScan> = {
            id: this.guidGenerator.createGuidFromBaseGuid(pageId),
            pageId: pageId,
            websiteScanId: websiteScanId,
            priority: priority,
            scanStatus: 'pending',
            retryCount: 0,
        };
        const pageScanDocument = this.normalizeDbDocument(pageScanData) as PageScan;
        await this.cosmosContainerClient.writeDocument(this.normalizeDbDocument(pageScanDocument));

        return pageScanDocument;
    }

    public async updatePageScan(pageScan: Partial<PageScan>): Promise<PageScan> {
        const pageScanDoc = this.normalizeDbDocument(pageScan);
        const response = await this.cosmosContainerClient.mergeOrWriteDocument(pageScanDoc);

        return response.item as PageScan;
    }

    public async readPageScan(id: string): Promise<PageScan> {
        const partitionKey = this.getPageScanPartitionKey(id);
        const response = await this.cosmosContainerClient.readDocument<PageScan>(id, partitionKey);
        client.ensureSuccessStatusCode(response);

        return response.item;
    }

    public getAllPageScansForWebsiteScan(websiteScanId: string): CosmosQueryResultsIterable<PageScan> {
        const partitionKey = this.getPageScanPartitionKey(websiteScanId);
        const query = {
            query: `SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.itemType = @itemType and c.websiteScanId = @websiteScanId`,
            parameters: [
                {
                    name: '@partitionKey',
                    value: partitionKey,
                },
                {
                    name: '@itemType',
                    value: itemTypes.pageScan,
                },
                {
                    name: '@websiteScanId',
                    value: websiteScanId,
                },
            ],
        };

        return this.cosmosQueryResultsProvider(this.cosmosContainerClient, query);
    }

    public async getLatestPageScanFor(websiteScanId: string, pageId: string, completed?: boolean): Promise<PageScan | undefined> {
        const partitionKey = this.getPageScanPartitionKey(websiteScanId);
        let filterConditions =
            'c.partitionKey = @partitionKey and c.itemType = @itemType and c.websiteScanId = @websiteScanId and c.pageId = @pageId';
        if (completed) {
            filterConditions = `${filterConditions} and c.scanStatus != "pending"`;
        }
        const query = {
            query: `SELECT TOP 1 * FROM c WHERE ${filterConditions} ORDER BY c._ts DESC`,
            parameters: [
                {
                    name: '@partitionKey',
                    value: partitionKey,
                },
                {
                    name: '@itemType',
                    value: itemTypes.pageScan,
                },
                {
                    name: '@websiteScanId',
                    value: websiteScanId,
                },
                {
                    name: '@pageId',
                    value: pageId,
                },
            ],
        };
        const response = await this.cosmosContainerClient.queryDocuments<PageScan>(query);
        client.ensureSuccessStatusCode(response);
        if (response.item.length === 0) {
            return undefined;
        }

        return response.item[0];
    }

    private normalizeDbDocument(pageScan: Partial<PageScan>): Partial<PageScan> {
        if (pageScan.id === undefined) {
            throw new Error('Page scan document has no id');
        }

        const normalizedDoc: Partial<PageScan> = {
            itemType: itemTypes.pageScan,
            partitionKey: this.getPageScanPartitionKey(pageScan.id),
            ...pageScan,
        };

        return normalizedDoc;
    }

    private getPageScanPartitionKey(guid: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(itemTypes.pageScan, guid);
    }
}
