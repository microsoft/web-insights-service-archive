// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger, Logger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { E2ETestRunnerEntryPoint } from './e2e-test-runner-entry-point';
import { E2ETestRunner } from './e2e-test-runner';

describe(E2ETestRunnerEntryPoint, () => {
    class TestableE2ETestRunnerEntryPoint extends E2ETestRunnerEntryPoint {
        public async runCustomAction(container: Container): Promise<void> {
            await super.runCustomAction(container);
        }

        public getTelemetryBaseProperties(): BaseTelemetryProperties {
            return super.getTelemetryBaseProperties();
        }
    }

    let containerMock: IMock<Container>;
    let loggerMock: IMock<Logger>;
    let runnerMock: IMock<E2ETestRunner>;

    let testSubject: TestableE2ETestRunnerEntryPoint;

    beforeEach(() => {
        containerMock = Mock.ofType<Container>();
        loggerMock = Mock.ofType<ContextAwareLogger>();
        runnerMock = Mock.ofType<E2ETestRunner>();
        containerMock.setup((c) => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
        containerMock.setup((c) => c.get(E2ETestRunner)).returns(() => runnerMock.object);

        testSubject = new TestableE2ETestRunnerEntryPoint(containerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('getTelemetryBaseProperties returns source property', () => {
        const expectedProperties = { source: 'e2eTestRunner' };
        const actualProperties = testSubject.getTelemetryBaseProperties();

        expect(actualProperties).toEqual(expectedProperties);
    });

    it('Custom action sets up logger', async () => {
        loggerMock.setup((l) => l.setup()).verifiable();

        await testSubject.runCustomAction(containerMock.object);
    });
});
