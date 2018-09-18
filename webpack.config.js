const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = {
    entry: {
        app: './src/app.js'
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'app.bundle.js'
    },
    module: {
        rules: [{
            test: /\.js?$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            query: {
                presets:['env']
            }
        }]
    },
    plugins: [
        new HtmlWebpackPlugin({
          template: './src/index.html'
        })
      ],
    mode: 'development',
    devtool: 'cheap-module-eval-source-map'
}
