// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, HashGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { ItemType } from 'storage-documents';

@injectable()
export class PartitionKeyFactory {
    constructor(
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public createPartitionKeyForDocument(documentType: ItemType, documentGuid: string): string {
        const node = this.guidGenerator.getGuidNode(documentGuid);

        return this.hashGenerator.getDbHashBucket(documentType, node);
    }
}
