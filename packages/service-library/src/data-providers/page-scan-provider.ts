// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { DocumentDataOnly, ItemType, PageScan } from 'storage-documents';
import { HashGenerator } from 'common';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

@injectable()
export class PageScanProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.scanMetadataRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        private readonly cosmosQueryResultsProvider: typeof getCosmosQueryResultsIterable = getCosmosQueryResultsIterable,
        private readonly getCurrentDate: () => Date = () => new Date(),
    ) {}

    public async createPageScan(pageId: string, websiteScanId: string, priority: number): Promise<PageScan> {
        const pageScanData: DocumentDataOnly<PageScan> = {
            id: this.hashGenerator.getPageScanDocumentId(pageId, websiteScanId),
            pageId: pageId,
            websiteScanId: websiteScanId,
            priority: priority,
            startDate: this.getCurrentDate(),
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

    public async readPageScan(pageId: string, websiteScanId: string): Promise<PageScan> {
        const pageScanId = this.hashGenerator.getPageScanDocumentId(pageId, websiteScanId);
        const partitionKey = this.getPageScanPartitionKey(pageId);
        const response = await this.cosmosContainerClient.readDocument<PageScan>(pageScanId, partitionKey);
        client.ensureSuccessStatusCode(response);

        return response.item;
    }

    public async readPageScanWithId(pageScanId: string): Promise<PageScan> {
        const response = await this.cosmosContainerClient.readDocument<PageScan>(pageScanId);
        client.ensureSuccessStatusCode(response);

        return response.item;
    }

    public getPageScansForWebsiteScan(
        websiteScanId: string,
        selectedProperties?: (keyof PageScan)[],
    ): CosmosQueryResultsIterable<PageScan> {
        const partitionKey = this.getPageScanPartitionKey(websiteScanId);
        const selectedPropertiesString = selectedProperties === undefined ? '*' : selectedProperties.join(', ');
        const query = {
            query: `SELECT @selectedProperties FROM c WHERE c.partitionKey = @partitionKey and c.itemType = @itemType and c.websiteScanId = @websiteScanId`,
            parameters: [
                {
                    name: '@partitionKey',
                    value: partitionKey,
                },
                {
                    name: '@itemType',
                    value: ItemType.pageScan,
                },
                {
                    name: '@selectedProperties',
                    value: selectedPropertiesString,
                },
                {
                    name: '@websiteScanId',
                    value: websiteScanId,
                },
            ],
        };

        return this.cosmosQueryResultsProvider(this.cosmosContainerClient, query);
    }

    private normalizeDbDocument(pageScan: Partial<PageScan>): Partial<PageScan> {
        if (pageScan.id === undefined) {
            throw new Error('Page scan document has no id');
        }

        const normalizedDoc: Partial<PageScan> = {
            itemType: ItemType.pageScan,
            ...pageScan,
        };

        if (pageScan.pageId !== undefined || pageScan.websiteScanId !== undefined) {
            const partitionKey = this.getPageScanPartitionKey(pageScan.pageId ?? pageScan.websiteScanId);
            normalizedDoc.partitionKey = normalizedDoc.partitionKey ?? partitionKey;
        }

        return normalizedDoc;
    }

    private getPageScanPartitionKey(pageOrWebsiteScanId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.pageScan, pageOrWebsiteScanId);
    }
}
