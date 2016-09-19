var path = require("path");
var webpack = require("webpack");

let babelQuerySettings = {
  presets: ['es2015', 'stage-1', 'react']
}

module.exports = {
  entry: {
    'dashboard': ['babel-polyfill', './static/js/dashboard'],
    'signup_dialog': './static/js/signup_dialog',
    'public': ['babel-polyfill', './static/js/public'],
    'public_program': ['babel-polyfill', './static/js/public_program'],
    'style': './static/js/style',
    'style_public': './static/js/style_public',
  },
  output: {
    path: path.resolve('./static/bundles/'),
    filename: "[name].js"
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loaders: ['react-hot', 'babel-loader?' + JSON.stringify(babelQuerySettings)],
      },  // to transform JSX into JS
      {
        test: /\.(svg|ttf|woff|woff2|eot)$/,
        loader: 'url-loader'
      },
      {
        test: /\.(gif)$/,
        loader: "url-loader",
        query: { mimetype: "image/gif" }
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        loader: 'style!css!sass'
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        loader: 'style!css'
      },
    ]
  },

  resolve: {
    modulesDirectories: ['node_modules'],
    extensions: ['', '.js', '.jsx'],
    alias: { 
      react: path.resolve('./node_modules/react')
    }
  }
};
