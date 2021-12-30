// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger, Logger } from 'logger';
import { E2ETestDataProvider } from 'service-library';

@injectable()
export class E2ETestRunner {
    constructor(
        @inject(ContextAwareLogger) private readonly logger: Logger,
        @inject(E2ETestDataProvider) private readonly e2eTestDataProvider: E2ETestDataProvider,
    ) {}

    public async run(): Promise<void> {
        await this.ensureTestWebsiteExists();

        this.logger.logInfo('E2E test runner not yet implemented');
    }

    private async ensureTestWebsiteExists(): Promise<void> {
        const response = await this.e2eTestDataProvider.readTestWebsite();

        if (response.error) {
            throw new Error(`Unable to read test website document: ${response.error}`);
        }

        const website = response.item;

        this.logger.logInfo(`Successfully read test website document with id ${website.id}`);
    }
}
