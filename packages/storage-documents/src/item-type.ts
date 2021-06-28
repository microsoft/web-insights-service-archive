// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const itemTypes = {
    website: 'website',
    page: 'page',
    websiteScan: 'websiteScan',
    pageScan: 'pageScan',
};

export type ItemTypes = typeof itemTypes;

export type ItemType = ItemTypes[keyof ItemTypes];
