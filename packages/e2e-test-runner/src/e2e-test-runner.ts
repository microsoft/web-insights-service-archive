// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger, Logger } from 'logger';

@injectable()
export class E2ETestRunner {
    constructor(@inject(ContextAwareLogger) private readonly logger: Logger) {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public async run(): Promise<void> {
        this.logger.logInfo('E2E test runner not yet implemented');
    }
}
