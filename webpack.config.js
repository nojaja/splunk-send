const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');
const webpack = require('webpack');
const version = JSON.stringify(require('./package.json')).version;

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    devtool: 'inline-source-map',
    target: 'node',
    context: src,
    entry: {
        'loader': './index.js'
    },
    output: {
        globalObject: 'this',
        filename: './[name].bundle.js',
        sourceMapFilename: './map/[id].[chunkhash].js.map',
        chunkFilename: './chunk/[id].[chunkhash].js',
        library: 'SplunkConnect', // ここがnewしたときの名前になる
        libraryExport: 'default',
        libraryTarget: 'umd',
        clean: true,
        path: dist
    },
    resolve: {
        extensions: ['.js'],
    },
    module: {
        rules: [],
    },
    plugins: [
        new webpack.DefinePlugin({
            __VERSION__: version
        })
    ]
};
