// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { IMock, Mock } from 'typemoq';
import { Context } from '@azure/functions';
import { GuidGenerator } from 'common';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import _ from 'lodash';
import { UpdatePageRequestValidator } from './update-page-request-validator';

describe(UpdatePageRequestValidator, () => {
    let pageUpdate: ApiContracts.PageUpdate;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let isValidPageUpdateMock: IMock<typeof ApiContracts.isValidPageUpdateObject>;

    let testSubject: UpdatePageRequestValidator;

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        isValidPageUpdateMock = Mock.ofInstance(() => true);
        pageUpdate = {
            pageId: 'page id',
            disabledScans: ['a11y'],
        };

        testSubject = new UpdatePageRequestValidator(guidGeneratorMock.object, isValidPageUpdateMock.object);
    });

    it('rejects invalid api version', async () => {
        const context: Context = createRequestContext('invalid api version');

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('rejects invalid page update object', async () => {
        isValidPageUpdateMock.setup((v) => v(pageUpdate)).returns(() => false);
        const context: Context = createRequestContext();

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
    });

    it('rejects page update with missing id', async () => {
        pageUpdate.pageId = undefined;
        const context: Context = createRequestContext();

        isValidPageUpdateMock.setup((v) => v(pageUpdate)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(pageUpdate.pageId)).returns(() => false);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
    });

    it('rejects page update with invalid guid', async () => {
        const context: Context = createRequestContext();

        isValidPageUpdateMock.setup((v) => v(pageUpdate)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(pageUpdate.pageId)).returns(() => false);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
    });

    it('accepts valid page update with valid guid', async () => {
        const context: Context = createRequestContext();

        isValidPageUpdateMock.setup((v) => v(pageUpdate)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(pageUpdate.pageId)).returns(() => true);

        const isValidRequest = await testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });

    function createRequestContext(apiVersion: string = '1.0'): Context {
        return <Context>(<unknown>{
            req: {
                url: 'baseUrl/pages',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                query: {
                    'api-version': apiVersion,
                },
                rawBody: JSON.stringify(pageUpdate),
            },
        });
    }
});
