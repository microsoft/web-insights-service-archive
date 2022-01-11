// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { WebInsightsClientProvider, WebInsightsServiceClientTypeNames } from 'storage-api-client';
import { FunctionalTestGroup } from './functional-test-group';

export type TestGroupConstructor = typeof FunctionalTestGroup;

@injectable()
export class TestContainerFactory {
    constructor(
        @inject(WebInsightsServiceClientTypeNames.WebInsightsClientProvider)
        private readonly webInsightsClientProvider: WebInsightsClientProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async createTestContainer(TestGroupType: TestGroupConstructor): Promise<FunctionalTestGroup> {
        const webInsightsClient = await this.webInsightsClientProvider();

        return new TestGroupType(webInsightsClient, this.guidGenerator);
    }
}
