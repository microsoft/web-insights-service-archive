// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { DocumentDataOnly, PartitionKey, Website } from 'storage-documents';
import { GuidGenerator } from 'common';

@injectable()
export class WebsiteProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.websiteRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async createWebsite(websiteData: DocumentDataOnly<Website>): Promise<void> {
        const websiteDoc = this.normalizeDbDocument(websiteData, this.guidGenerator.createGuid());
        await this.cosmosContainerClient.writeDocument(websiteDoc);
    }

    public async updateWebsite(website: Partial<Website>): Promise<void> {
        const websiteDoc = this.normalizeDbDocument(website);
        await this.cosmosContainerClient.mergeOrWriteDocument(websiteDoc);
    }

    public async readWebsite(id: string): Promise<Website> {
        return (await this.cosmosContainerClient.readDocument<Website>(id, PartitionKey.websiteDocuments)).item;
    }

    private normalizeDbDocument(website: Partial<Website>, id?: string): Partial<Website> {
        if (id === undefined && website.id === undefined) {
            throw new Error('Website document has no associated id');
        }

        return {
            id: id,
            itemType: 'website',
            partitionKey: PartitionKey.websiteDocuments,
            ...website,
        };
    }
}
