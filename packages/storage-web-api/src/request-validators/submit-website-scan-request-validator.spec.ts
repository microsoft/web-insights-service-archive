// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { IMock, Mock } from 'typemoq';
import { GuidGenerator } from 'common';
import * as cronParser from 'cron-parser';
import { Context } from '@azure/functions';
import { SubmitWebsiteScanRequestValidator } from './submit-website-scan-request-validator';

describe(SubmitWebsiteScanRequestValidator, () => {
    let websiteScanRequest: ApiContracts.WebsiteScanRequest;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let isValidWebsiteScanRequestMock: IMock<typeof ApiContracts.isValidWebsiteScanRequestObject>;
    let cronParserMock: IMock<typeof cronParser>;

    let testSubject: SubmitWebsiteScanRequestValidator;

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        isValidWebsiteScanRequestMock = Mock.ofInstance(() => null);
        cronParserMock = Mock.ofInstance(cronParser);
        websiteScanRequest = {
            websiteId: 'website id',
            scanType: 'a11y',
        };

        testSubject = new SubmitWebsiteScanRequestValidator(
            guidGeneratorMock.object,
            isValidWebsiteScanRequestMock.object,
            cronParserMock.object,
        );
    });

    it('rejects request with invalid api version', () => {
        const context = createRequestContext('2.0');
        expect(testSubject.validateRequest(context)).toBeFalsy();
    });

    it('rejects invalid website scan request object', () => {
        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => false);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);

        const context = createRequestContext();
        expect(testSubject.validateRequest(context)).toBeFalsy();
    });

    it('rejects website scan request with invalid website guid', () => {
        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => false);

        const context = createRequestContext();
        expect(testSubject.validateRequest(context)).toBeFalsy();
    });

    it('rejects website scan request with invalid cron expression', () => {
        const scanFrequency = 'invalid cron expression';
        websiteScanRequest.scanFrequency = scanFrequency;

        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);
        cronParserMock.setup((p) => p.parseExpression(scanFrequency)).throws(new Error('test error'));

        const context = createRequestContext();
        expect(testSubject.validateRequest(context)).toBeFalsy();
    });

    it('accepts website scan request with valid guid and no specified frequency', () => {
        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);

        const context = createRequestContext();
        expect(testSubject.validateRequest(context)).toBeTruthy();
    });

    it('accepts website scan request with valid guid and valid frequency expression', () => {
        const scanFrequency = 'valid cron expression';
        websiteScanRequest.scanFrequency = scanFrequency;

        isValidWebsiteScanRequestMock.setup((v) => v(websiteScanRequest)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(websiteScanRequest.websiteId)).returns(() => true);
        cronParserMock.setup((p) => p.parseExpression(scanFrequency)).verifiable();

        const context = createRequestContext();
        expect(testSubject.validateRequest(context)).toBeTruthy();

        cronParserMock.verifyAll();
    });

    function createRequestContext(apiVersion: string = '1.0'): Context {
        return <Context>(<unknown>{
            req: {
                url: 'baseUrl/scans/websites',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                query: {
                    'api-version': apiVersion,
                },
                rawBody: JSON.stringify(websiteScanRequest),
            },
        });
    }
});
