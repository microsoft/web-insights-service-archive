// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as ApiContracts from 'api-contracts';
import { IMock, Mock } from 'typemoq';
import { Context } from '@azure/functions';
import { GuidGenerator } from 'common';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import _ from 'lodash';
import { PostWebsiteRequestValidator } from './post-website-request-validator';

describe(PostWebsiteRequestValidator, () => {
    let website: ApiContracts.Website;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let isValidWebsiteMock: IMock<typeof ApiContracts.isValidWebsiteObject>;

    let testSubject: PostWebsiteRequestValidator;

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        isValidWebsiteMock = Mock.ofInstance(() => true);
        website = _.cloneDeep(ApiContracts.websiteWithRequiredProperties);

        testSubject = new PostWebsiteRequestValidator(guidGeneratorMock.object, isValidWebsiteMock.object);
    });

    it('rejects invalid api version', () => {
        const context: Context = createRequestContext('invalid api version');

        const isValidRequest = testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion));
    });

    it('rejects invalid website object', () => {
        isValidWebsiteMock.setup((v) => v(website)).returns(() => false);
        const context: Context = createRequestContext();

        const isValidRequest = testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
    });

    it('reject website with invalid guid', () => {
        website.id = 'website id';
        const context: Context = createRequestContext();

        isValidWebsiteMock.setup((v) => v(website)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(website.id)).returns(() => false);

        const isValidRequest = testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
    });

    it('rejects website with pages property', () => {
        website.pages = [{ id: 'page id', url: 'page url' }];
        const context: Context = createRequestContext();

        isValidWebsiteMock.setup((v) => v(website)).returns(() => true);

        const isValidRequest = testSubject.validateRequest(context);

        expect(isValidRequest).toBeFalsy();
        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
    });

    it('accepts valid website with no id', () => {
        const context: Context = createRequestContext();

        isValidWebsiteMock.setup((v) => v(website)).returns(() => true);

        const isValidRequest = testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });

    it('accepts valid website with valid guid', () => {
        website.id = 'website id';
        const context: Context = createRequestContext();

        isValidWebsiteMock.setup((v) => v(website)).returns(() => true);
        guidGeneratorMock.setup((g) => g.isValidV6Guid(website.id)).returns(() => true);

        const isValidRequest = testSubject.validateRequest(context);

        expect(isValidRequest).toBeTruthy();
    });

    function createRequestContext(apiVersion: string = '1.0'): Context {
        return <Context>(<unknown>{
            req: {
                url: 'baseUrl/websites',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                query: {
                    'api-version': apiVersion,
                },
                rawBody: JSON.stringify(website),
            },
        });
    }
});
