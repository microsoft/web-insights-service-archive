// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as appInsights from 'applicationinsights';
import { inject, injectable } from 'inversify';
import { isNil, omitBy } from 'lodash';
import { BaseAppInsightsLoggerClient } from './base-app-insights-logger-client';
import { loggerTypes } from './logger-types';

@injectable()
export class AppInsightsLoggerClient extends BaseAppInsightsLoggerClient {
    constructor(
        @inject(loggerTypes.AppInsights) private readonly appInsightsObject: typeof appInsights,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
    ) {
        super();
    }

    public async setup(baseProperties?: { [property: string]: string }): Promise<void> {
        this.appInsightsObject
            .setup()
            .setAutoCollectConsole(true)
            .setAutoCollectExceptions(true)
            .setAutoCollectRequests(true)
            .setAutoCollectDependencies(true)
            .setAutoDependencyCorrelation(true);

        // this should be set after calling setup

        this.appInsightsObject.defaultClient.commonProperties = {
            ...this.getDefaultProperties(),
            ...baseProperties,
        };

        this.appInsightsObject.start();

        this.telemetryClient = this.appInsightsObject.defaultClient;

        this.initialized = true;
    }

    private getDefaultProperties(): { [key: string]: string } {
        // add common default property from host environment here
        const properties = {
            prop: this.currentProcess.env.VAR,
        };

        return omitBy(properties, isNil);
    }
}
