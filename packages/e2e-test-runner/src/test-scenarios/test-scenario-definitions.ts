// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TestGroupConstructor } from '../functional-tests/test-container-factory';

export type TestPhases = {
    beforeScan: TestGroupConstructor[];
};

export type TestScenarioDefinition = {
    readableName: string;
    websiteDataBlobName: string;
    testPhases: Partial<TestPhases>;
};

export type TestScenarioDefinitionFactory = () => TestScenarioDefinition;

export const allTestScenarioFactories: TestScenarioDefinitionFactory[] = [
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
