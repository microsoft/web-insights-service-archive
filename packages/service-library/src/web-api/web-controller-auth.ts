// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { AzureAdAuth } from 'azure-services';
import { Context } from '@azure/functions';
import { isEmpty } from 'lodash';
import { HttpResponse } from './http-response';
import { WebApiErrorCodes } from './web-api-error-codes';

@injectable()
export class WebControllerAuth {
    constructor(@inject(AzureAdAuth) protected readonly azureAdAuth?: AzureAdAuth) {}

    public async authorize(requestContext: Context, aclName: string): Promise<boolean> {
        const token = this.getToken(requestContext);
        if (!isEmpty(token) && !isEmpty(aclName)) {
            const authorized = await this.azureAdAuth.authorize(token, aclName);
            if (authorized === true) {
                return true;
            }
        }

        requestContext.res = HttpResponse.getErrorResponse(WebApiErrorCodes.unauthorized);

        return false;
    }

    private getToken(requestContext: Context): string {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        const authHeader = requestContext?.req?.headers['authorization'];

        return !isEmpty(authHeader) && authHeader.startsWith('Bearer ') ? authHeader.substring(7, authHeader.length) : undefined;
    }
}
