// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = () => {
    return {
        devtool: 'cheap-source-map',
        entry: {
            ['e2e-test-runner']: path.resolve('./src/index.ts'),
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
        name: 'e2e-test-runner',
        node: {
            __dirname: false,
        },
        output: {
            path: path.resolve('./dist'),
            filename: '[name].js',
            libraryTarget: 'commonjs2',
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin(),
            new copyWebpackPlugin({
                patterns: [
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
