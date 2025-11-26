const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const GasHtmlSeparatorPlugin = require('./gas-html-separator-plugin.cjs');

module.exports = {
    mode: 'production',
    entry: './src/main.tsx',
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'app.bundle.js',
        publicPath: '',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    targets: { chrome: '80' },
                                    modules: false,
                                }],
                                '@babel/preset-react',
                                '@babel/preset-typescript',
                            ],
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'styles.css',
        }),
        new GasHtmlSeparatorPlugin(),
    ],
    optimization: {
        minimize: true,
    },
};
