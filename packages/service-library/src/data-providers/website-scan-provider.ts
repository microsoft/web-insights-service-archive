// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { inject, injectable } from 'inversify';
import { DocumentDataOnly, itemTypes, ScanType, WebsiteScan } from 'storage-documents';
import { GuidGenerator } from 'common';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

@injectable()
export class WebsiteScanProvider {
    private readonly defaultPriority = 0;

    public constructor(
        @inject(cosmosContainerClientTypes.scanMetadataRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        private readonly cosmosQueryResultsProvider: typeof getCosmosQueryResultsIterable = getCosmosQueryResultsIterable,
    ) {}

    public async createScanDocumentForWebsite(
        websiteId: string,
        scanType: ScanType,
        frequency: string,
        priority?: number,
    ): Promise<WebsiteScan> {
        const websiteScanData: DocumentDataOnly<WebsiteScan> = {
            id: this.guidGenerator.createGuidFromBaseGuid(websiteId),
            websiteId: websiteId,
            scanType: scanType,
            scanFrequency: frequency,
            scanStatus: 'pending',
            priority: priority ?? this.defaultPriority,
        };
        const websiteScanDoc = this.normalizeDbDocument(websiteScanData) as WebsiteScan;
        await this.cosmosContainerClient.writeDocument(websiteScanDoc);

        return websiteScanDoc;
    }

    public async updateWebsiteScan(websiteScan: Partial<WebsiteScan>): Promise<WebsiteScan> {
        const websiteScanDoc = this.normalizeDbDocument(websiteScan);
        const response = await this.cosmosContainerClient.mergeOrWriteDocument(websiteScanDoc);

        return response.item as WebsiteScan;
    }

    public async readWebsiteScan(id: string, throwIfNotSuccess: boolean = true): Promise<CosmosOperationResponse<WebsiteScan>> {
        return this.cosmosContainerClient.readDocument<WebsiteScan>(id, this.getWebsiteScanPartitionKey(id), throwIfNotSuccess);
    }

    public getScansForWebsite(websiteId: string): CosmosQueryResultsIterable<WebsiteScan> {
        const partitionKey = this.getWebsiteScanPartitionKey(websiteId);
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
                    value: itemTypes.websiteScan,
                },
            ],
        };

        return this.cosmosQueryResultsProvider(this.cosmosContainerClient, query);
    }

    public async getLatestScanForWebsite(websiteId: string, scanType: ScanType): Promise<WebsiteScan | null> {
        const partitionKey = this.getWebsiteScanPartitionKey(websiteId);
        const query = {
            query:
                'SELECT TOP 1 * FROM c ' +
                'WHERE c.partitionKey = @partitionKey and c.websiteId = @websiteId and c.itemType = @itemType and c.scanType = @scanType ' +
                'ORDER BY c._ts DESC',
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
                    value: itemTypes.websiteScan,
                },
                {
                    name: '@scanType',
                    value: scanType,
                },
            ],
        };

        const response = await this.cosmosContainerClient.queryDocuments<WebsiteScan>(query);
        client.ensureSuccessStatusCode(response);

        if (response.item.length === 0) {
            return null;
        }

        return response.item[0];
    }

    private normalizeDbDocument(websiteScan: Partial<WebsiteScan>): Partial<WebsiteScan> {
        if (websiteScan.id === undefined) {
            throw new Error('Website scan document has no id');
        }

        return {
            itemType: itemTypes.websiteScan,
            partitionKey: this.getWebsiteScanPartitionKey(websiteScan.id),
            ...websiteScan,
        };
    }

    private getWebsiteScanPartitionKey(scanOrWebsiteId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(itemTypes.websiteScan, scanOrWebsiteId);
    }
}
