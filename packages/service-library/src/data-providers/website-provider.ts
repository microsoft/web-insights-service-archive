// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client, CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { DocumentDataOnly, itemTypes, PartitionKey, Website } from 'storage-documents';
import { GuidGenerator } from 'common';
import _ from 'lodash';

@injectable()
export class WebsiteProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.websiteRepoContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async createWebsite(websiteData: DocumentDataOnly<Website>): Promise<Website> {
        const websiteDoc = this.normalizeDbDocument(websiteData, this.guidGenerator.createGuid());
        await this.cosmosContainerClient.writeDocument(websiteDoc);

        return websiteDoc as Website;
    }

    public async updateWebsite(website: Partial<Website>): Promise<Website> {
        const websiteDoc = this.normalizeDbDocument(website);

        const response = await this.cosmosContainerClient.mergeOrWriteDocument(
            websiteDoc,
            websiteDoc.partitionKey,
            true,
            (target, source, key) => {
                if (key === 'knownPages') {
                    // concat and deduplicate knownPages
                    return _.uniq([...(target as string[]), ...(source as string[])]);
                }
                if (_.isArray(target)) {
                    // deduplicate and overwrite other array fields
                    return _.uniq(source as unknown[]);
                }

                return undefined;
            },
        );

        return response.item as Website;
    }

    public async readWebsite(id: string): Promise<Website> {
        const response = await this.cosmosContainerClient.readDocument<Website>(id, PartitionKey.websiteDocuments);
        client.ensureSuccessStatusCode(response);

        return response.item;
    }

    private normalizeDbDocument(website: Partial<Website>, id?: string): Partial<Website> {
        if (id === undefined && website.id === undefined) {
            throw new Error('Website document has no associated id');
        }

        return {
            id: id,
            itemType: itemTypes.website,
            partitionKey: PartitionKey.websiteDocuments,
            ...website,
        };
    }
}
