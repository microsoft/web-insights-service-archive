// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { is } from 'typescript-is';
import { PageUpdate } from '../types/page-update';

export function isValidPageUpdateObject(obj: PageUpdate): boolean {
    return is<PageUpdate>(obj);
}
