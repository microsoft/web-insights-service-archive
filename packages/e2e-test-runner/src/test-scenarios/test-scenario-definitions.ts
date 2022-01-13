// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TestGroupConstructor } from '../functional-tests/test-container-factory';
import { GetWebsiteTestGroup } from '../functional-tests/test-groups/get-website-test-group';
import { PostWebsiteScanTestGroup } from '../functional-tests/test-groups/post-website-scan-test-group';
import { PostWebsiteTestGroup } from '../functional-tests/test-groups/post-website-test-group';

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
                beforeScan: [GetWebsiteTestGroup, PostWebsiteTestGroup, PostWebsiteScanTestGroup],
            },
        };
    },
];
