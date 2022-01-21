// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
    let version = 'dev';
    if (env && env.version) {
        version = env.version;
    }
    console.log(`Building for version : ${version}`);

    return {
        devtool: 'cheap-source-map',
        externals: ['@azure/functions'],
        entry: {
            ['get-health-report-func']: path.resolve('./get-health-report-func/index.ts'),
            ['get-website-func']: path.resolve('./get-website-func/index.ts'),
            ['post-website-func']: path.resolve('./post-website-func/index.ts'),
            ['post-page-func']: path.resolve('./post-page-func/index.ts'),
            ['get-website-scan-func']: path.resolve('./get-website-scan-func/index.ts'),
            ['post-website-scan-func']: path.resolve('./post-website-scan-func/index.ts'),
        },
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: true,
                                experimentalWatchApi: true,
                            },
                        },
                    ],
                    exclude: ['/node_modules/', /\.(spec|e2e)\.ts$/],
                },
                {
                    test: /\.node$/,
                    use: [
                        {
                            loader: 'node-loader',
                        },
                    ],
                },
            ],
        },
        name: 'storage-web-api',
        node: {
            __dirname: false,
        },
        output: {
            path: path.resolve('./dist'),
            filename: '[name]/index.js',
            libraryTarget: 'commonjs2',
        },
        plugins: [
            new webpack.DefinePlugin({
                __IMAGE_VERSION__: JSON.stringify(version),
            }),
            new ForkTsCheckerWebpackPlugin(),
            new copyWebpackPlugin({
                patterns: [
                    {
                        context: './',
                        from: '**/function.json',
                        to: '',
                        globOptions: { ignore: ['dist/**'] },
                    },
                    {
                        context: './',
                        from: 'host.json',
                        to: '',
                        globOptions: { ignore: ['dist/**'] },
                    },
                    {
                        context: '../resource-deployment/runtime-config',
                        from: `runtime-config.${version}.json`, // production config is copied by external deployment script
                        to: 'runtime-config.json',
                    },
                    {
                        context: './docker-image-config',
                        from: '.dockerignore',
                        to: '',
                    },
                    {
                        context: './docker-image-config',
                        from: 'Dockerfile',
                        to: '',
                    },
                ],
            }),
        ],
        resolve: {
            extensions: ['.ts', '.js', '.json'],
            mainFields: ['main'],
        },
        target: 'node',
    };
};
