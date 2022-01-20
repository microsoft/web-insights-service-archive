// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { registerAzureServicesToContainer } from 'azure-services';
import { GuidGenerator, IoC, setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { registerWebInsightsStorageClientToContainer } from 'storage-api-client';
import { E2ETestRunnerTypeNames } from './type-names';

export function setupE2ETestRunnerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);
    registerWebInsightsStorageClientToContainer(container);

    IoC.setupSingletonProvider(E2ETestRunnerTypeNames.testRunIdProvider, container, async (context) =>
        context.container.get<GuidGenerator>(GuidGenerator).createGuid(),
    );

    return container;
}
