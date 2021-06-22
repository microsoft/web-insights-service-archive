// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { DocumentDataOnly, ItemType, ScanType, Website, WebsiteScan } from 'storage-documents';
import { GuidGenerator } from 'common';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

@injectable()
export class WebsiteScanProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.scanMetadataRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        private readonly cosmosQueryResultsProvider: typeof getCosmosQueryResultsIterable = getCosmosQueryResultsIterable,
    ) {}

    public async createScanDocumentForWebsite(websiteId: string, scanType: ScanType, frequency: number): Promise<void> {
        const websiteScanData: DocumentDataOnly<WebsiteScan> = {
            id: this.guidGenerator.createGuidFromBaseGuid(websiteId),
            websiteId: websiteId,
            scanType: scanType,
            scanFrequency: frequency,
            scanStatus: 'pending',
        };
        await this.cosmosContainerClient.writeDocument(this.normalizeDbDocument(websiteScanData));
    }

    public async updateWebsitecan(websiteScan: Partial<WebsiteScan>): Promise<void> {
        const websiteDoc = this.normalizeDbDocument(websiteScan);
        await this.cosmosContainerClient.mergeOrWriteDocument(websiteDoc);
    }

    public async readWebsiteScan(id: string): Promise<Website> {
        const response = await this.cosmosContainerClient.readDocument<Website>(id, this.getWebsiteScanPartitionKey(id));
        client.ensureSuccessStatusCode(response);

        return response.item;
    }

    public getScansForWebsite(websiteId: string, selectedProperties?: (keyof WebsiteScan)[]): CosmosQueryResultsIterable<WebsiteScan> {
        const partitionKey = this.getWebsiteScanPartitionKey(websiteId);
        const selectedPropertiesString = selectedProperties === undefined ? '*' : selectedProperties.join(', ');
        const query = {
            query: 'SELECT @selectedProperties FROM c WHERE c.partitionKey = @partitionKey and c.websiteId = @websiteId and c.itemType = @itemType',
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
                    value: ItemType.websiteScan,
                },
                {
                    name: '@selectedProperties',
                    value: selectedPropertiesString,
                },
            ],
        };

        return this.cosmosQueryResultsProvider(this.cosmosContainerClient, query);
    }

    private normalizeDbDocument(websiteScan: Partial<WebsiteScan>): Partial<WebsiteScan> {
        if (websiteScan.id === undefined) {
            throw new Error('Website scan document has no id');
        }

        return {
            itemType: ItemType.websiteScan,
            partitionKey: this.getWebsiteScanPartitionKey(websiteScan.id),
            ...websiteScan,
        };
    }

    private getWebsiteScanPartitionKey(scanOrWebsiteId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.websiteScan, scanOrWebsiteId);
    }
}
