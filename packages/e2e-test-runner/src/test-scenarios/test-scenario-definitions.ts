// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FunctionalTestGroup } from '../functional-tests/functional-test-group';

type TestGroupConstructor = typeof FunctionalTestGroup;

export type TestPhases = {
    beforeScan: TestGroupConstructor[];
};

export type TestScenarioDefinition = {
    readableName: string;
    websiteDataBlobName: string;
    testPhases: Partial<TestPhases>;
};

export type TestScenarioDefinitionFactory = () => TestScenarioDefinition;

export const TestScenarioFactories: TestScenarioDefinitionFactory[] = [
    (): TestScenarioDefinition => {
        return {
            readableName: 'SimpleScan ',
            websiteDataBlobName: 'test-website.json',
            testPhases: {
                beforeScan: [],
            },
        };
    },
];
