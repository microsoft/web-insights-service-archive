// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const E2ETestRunnerTypeNames = {
    testRunIdProvider: 'testRunIdProvider',
};

export type TestRunIdProvider = () => Promise<string>;
