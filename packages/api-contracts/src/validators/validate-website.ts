// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { is } from 'typescript-is';
import { Website } from '../types/website';

export function isValidWebsite(obj: Website): boolean {
    return is<Website>(obj);
}
