// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { client } from 'azure-services';
import { getSerializableResponse } from 'common';
import _ from 'lodash';
import { Logger, LoggerProperties } from 'logger';
import { ScanType } from 'storage-documents';
import { TestContainerFactory } from '../functional-tests/test-container-factory';
import { TestContextData } from '../functional-tests/test-context-data';
import { TestRunner } from '../functional-tests/test-runner';
import { WebApiConfig } from '../web-api-config';
import { TestScanHandler } from './test-scan-handler';
import { TestPhases, TestScenarioDefinition } from './test-scenario-definitions';
import { TestScenarioSetupHandler } from './test-scenario-setup-handler';

export class TestScenarioDriver {
    protected testContextData: TestContextData;

    constructor(
        private readonly testScenarioDefinition: TestScenarioDefinition,
        private readonly logger: Logger,
        private readonly testScenarioSetupHandler: TestScenarioSetupHandler,
        private readonly testContainerFactory: TestContainerFactory,
        private readonly testRunner: TestRunner,
        private readonly testScanHandler: TestScanHandler,
        private readonly webApiConfig: WebApiConfig,
        private readonly testRunId: string,
    ) {}

    public async executeTestScenario(): Promise<void> {
        try {
            this.testContextData = await this.testScenarioSetupHandler.setUpTestScenario(this.testScenarioDefinition);
        } catch (e) {
            this.logTestFailure('Failed to set up test scenario.', { error: JSON.stringify(e) });

            return;
        }

        await this.runTestPhase('beforeScan');

        for (const scanType of this.testScenarioDefinition.scansToRun) {
            const submitScanSucceeded = await this.trySubmitScan(scanType);
            if (!submitScanSucceeded) {
                return;
            }
        }

        await this.runTestPhase('afterScanSubmission');

        this.logTestSuccess();
    }

    private async runTestPhase(phaseName: keyof TestPhases): Promise<void> {
        const testContainerClasses = this.testScenarioDefinition.testPhases[phaseName];
        if (_.isEmpty(testContainerClasses)) {
            return;
        }
        const testContainers = await Promise.all(
            testContainerClasses.map((testContainerClass) => this.testContainerFactory.createTestContainer(testContainerClass)),
        );

        await this.testRunner.runAll(testContainers, { scenarioName: this.testScenarioDefinition.readableName }, this.testContextData);
    }

    private async trySubmitScan(scanType: ScanType): Promise<boolean> {
        const submitScanResponse = await this.testScanHandler.submitTestScan(scanType, this.testContextData.websiteId);
        if (!client.isSuccessStatusCode(submitScanResponse) || submitScanResponse.body === undefined) {
            this.logTestFailure(`Failed to submit ${scanType} scan`, {
                requestResponse: JSON.stringify(getSerializableResponse(submitScanResponse)),
            });

            return false;
        }
        this.testContextData.websiteScans.push({ scanId: submitScanResponse.body.id, scanType: scanType });

        return true;
    }

    private getBaseTelemetryProperties(): LoggerProperties {
        return {
            testScenarioName: this.testScenarioDefinition.readableName,
            websiteId: this.testContextData?.websiteId,
            runId: this.testRunId,
            releaseId: this.webApiConfig.releaseId,
        };
    }

    private logTestFailure(errorMessage: string, telemetryProperties: LoggerProperties): void {
        this.logger.logError(errorMessage, {
            ...this.getBaseTelemetryProperties(),
            ...telemetryProperties,
        });
        this.logger.trackAvailability('workerAvailabilityTest', {
            success: false,
            properties: {
                ...this.getBaseTelemetryProperties(),
                ...telemetryProperties,
            },
        });
    }

    private logTestSuccess(): void {
        this.logger.logInfo('Successfully completed test scenario', {
            ...this.getBaseTelemetryProperties(),
        });
        this.logger.trackAvailability('workerAvailabilityTest', {
            success: true,
            properties: {
                ...this.getBaseTelemetryProperties(),
            },
        });
    }
}
