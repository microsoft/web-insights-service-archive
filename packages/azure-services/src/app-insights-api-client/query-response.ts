// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type Column = {
    name: string;
    type: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any[];

export type Table = {
    name: string;
    columns: Column[];
    rows: Row[];
};

export type ApplicationInsightsQueryResponse = {
    tables: Table[];
};
