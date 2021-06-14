// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import convict from 'convict';
import { injectable } from 'inversify';
import { isNil } from 'lodash';

export interface QueueRuntimeConfig {
    maxQueueSize: number;
    messageVisibilityTimeoutInSeconds: number;
}

export interface LogRuntimeConfig {
    logInConsole: boolean;
}

export interface RestApiConfig {
    minScanPriorityValue: number;
    maxScanPriorityValue: number;
}

export interface RuntimeConfig {
    logConfig: LogRuntimeConfig;
    queueConfig: QueueRuntimeConfig;
    restApiConfig: RestApiConfig;
}

export declare type ResourceType = 'batch' | 'registry';

@injectable()
export class ServiceConfiguration {
    public static readonly profilePath = `${__dirname}/runtime-config.json`;

    private readonly fileSystem: typeof fs;

    private loadConfigPromise: Promise<convict.Config<RuntimeConfig>>;

    private readonly convictModule: typeof convict;

    constructor(fileSystem: typeof fs = fs, convictModule: typeof convict = convict) {
        this.fileSystem = fileSystem;
        this.convictModule = convictModule;
    }

    public async getConfigValue<K extends keyof RuntimeConfig | null | undefined = undefined>(
        key?: K,
    ): Promise<K extends null | undefined ? RuntimeConfig : RuntimeConfig[K]> {
        const config = await this.getConvictConfig();

        return config.get(key);
    }

    public getAzureResourceName(sourceResourceType: ResourceType, sourceResourceName: string, targetResourceType: ResourceType): string {
        // Expected resource name format ally<resourceType><resourceGroupSuffix>
        return sourceResourceName.replace(sourceResourceType, targetResourceType);
    }

    private async getConvictConfig(): Promise<convict.Config<RuntimeConfig>> {
        if (isNil(this.loadConfigPromise)) {
            this.loadConfigPromise = new Promise((resolve, reject) => {
                const config = this.convictModule<RuntimeConfig>(this.getRuntimeConfigSchema());

                // eslint-disable-next-line security/detect-non-literal-fs-filename
                this.fileSystem.exists(ServiceConfiguration.profilePath, (exists) => {
                    if (exists === true) {
                        config.loadFile(ServiceConfiguration.profilePath);
                        config.validate({ allowed: 'strict' });
                    } else {
                        console.log(`Unable to load custom configuration. Using default config  - ${config}`);
                    }
                    resolve(config);
                });
            });
        }

        return this.loadConfigPromise;
    }

    private getRuntimeConfigSchema(): convict.Schema<RuntimeConfig> {
        return {
            logConfig: {
                logInConsole: {
                    format: 'Boolean',
                    default: true,
                    doc: 'Property to decide if console logging is enabled',
                },
            },
            queueConfig: {
                maxQueueSize: {
                    format: 'int',
                    default: 10,
                    doc: 'Maximum message count in scan request queue.',
                },
                messageVisibilityTimeoutInSeconds: {
                    format: 'int',
                    default: 30 * 1.5 * 60, // maxWallClockTimeInMinutes * delta termination wait time
                    doc: 'Message visibility timeout in seconds. Must correlate with jobManagerConfig.maxWallClockTimeInMinutes config value.',
                },
            },
            restApiConfig: {
                minScanPriorityValue: {
                    format: 'int',
                    default: -1000,
                    doc: 'Priority values can range from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority.\
                        This range correlates with Azure Batch pool task priority range.',
                },
                maxScanPriorityValue: {
                    format: 'int',
                    default: 1000,
                    doc: 'Priority values can range from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority.\
                        This range correlates with Azure Batch pool task priority range.',
                },
            },
        };
    }
}
