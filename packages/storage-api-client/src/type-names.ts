// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebInsightsStorageClient } from './web-insights-storage-client';

export const WebInsightsServiceClientTypeNames = {
    WebInsightsClientProvider: 'WebInsightsClientProvider',
};

export type WebInsightsClientProvider = () => Promise<WebInsightsStorageClient>;
