// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { exec } from 'child_process';
import * as path from 'path';

const scriptDir = path.join(__dirname, '/scripts');

const runShellCommand = async (command: string): Promise<string> =>
    new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                (error as any).stdout = stdout;
                (error as any).stderr = stderr;
                reject(error);
            }
            resolve(stdout);
        });
    });

export const getAuthorityUrl = async (): Promise<string> => {
    return (await runShellCommand(`${scriptDir}/get-authority-url.sh`)).trim();
};

export const getFrontendDns = async (resourceGroup: string): Promise<string> => {
    return (await runShellCommand(`${scriptDir}/get-frontend-dns.sh -r "${resourceGroup}"`)).trim();
};
