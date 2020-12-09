const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

var config = function(env) {
  env = env || {};
  env.profile = env.profile || 'debug';

  var profile = (function() {
    var out = {};
    switch (env.profile) {
      case 'debug':
        out.mode = 'development';
        out.outputPath = './build/debug';
        break;
      case 'release':
        out.mode = 'production';
        out.outputPath = './build/release';
        break;
    }
    return out;
  })(env);

  var out = {
    mode: profile.mode,
    target: 'web',
    entry: [
      '@babel/polyfill',
      './src/js/index.ts',
    ],
    output: {
      path: path.resolve(__dirname, profile.outputPath),
      filename: 'app.js'
    },
    module: {
      rules: [
        {
          test: /\.(sa|sc|c)ss$/,
          oneOf: [
            {
              resourceQuery: /lit/, // foo.scss?lit
              use: [
                { loader: 'lit-scss-loader', options: { minify: true } },
                { loader: 'extract-loader' },
                { loader: 'css-loader' },
                { loader: 'resolve-url-loader', options: { sourceMap: true } },
                {
                  loader: 'sass-loader',
                  options: {
                    sassOptions: {
                      includePaths: ['.', './src', './node_modules'],
                    },
                  },
                },
              ],
            },
            {
              use: [
                { loader: MiniCssExtractPlugin.loader },
                { loader: 'css-loader', options: { sourceMap: true } },
                { loader: 'resolve-url-loader', options: { sourceMap: true } },
                {
                  loader: 'sass-loader',
                  options: {
                    sassOptions: {
                      includePaths: ['.', './src', './node_modules'],
                    },
                    sourceMap: true,
                  },
                },
              ],
            },
          ],
        },
        {
          test: /\.(png|jpg|gif|woff|woff2)/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000,
                alias: {}
              }
            }
          ]
        },
        {
          test: /\.(ttf|eot|svg|otf)/,
          use: [
            {
              loader: 'file-loader'
            }
          ]
        },
        {
          test: /\.tsx?$/,
          exclude: path.resolve(__dirname, './node_modules/'),
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                    corejs: '3.0.0',
                    useBuiltIns: 'entry',
                  }],
                ],
                plugins: [
                  path.resolve(__dirname, './babel/plugins/jsx-to-lit-html.js'),
                ]
              }
            },
            {
              loader: 'ts-loader'
            },
          ]
        },
        {
          test: /\.hbs$/,
          use: [
            {
              loader: 'handlebars-loader',
              options: {
                minimize: env.profile === 'debug',
                extensions: ['handlebars', 'hbs', ''],
                helperDirs: [
                  path.resolve(__dirname, './src/html/helpers/')
                ]
              }
            }
          ]
        },
        {
          test: /\.mp3$/,
          exclude: path.resolve(__dirname, './node_modules/'),
          loader: 'file-loader'
        },
      ]
    },
    resolve: {
      modules: [
        path.resolve(__dirname, './src'),
        'node_modules'
      ],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {}
    },
    plugins: [
      new webpack.ProvidePlugin({}),
      new webpack.LoaderOptionsPlugin({
        minimize: true, debug: false
      }),
      new MiniCssExtractPlugin({
        filename: 'app.css',
        chunkFilename: profile.mode === 'development' ? '[id].css' : '[id].[hash].css',
      }),
      ...['chat', 'tts', 'space-bg'].map(filename => new HtmlWebpackPlugin({
        filename: filename + '/index.html',
        template: 'src/html/' + filename + '.hbs',
        inject: 'head',
        minify: env.profile === 'debug' ? false : {
          removeAttributeQuotes: true,
          collapseWhitespace: true,
          html5: true,
          minifyCSS: true,
          removeComments: true,
          removeEmptyAttributes: true
        },
        hash: true
      })),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new webpack.DefinePlugin({
        'process.env.PUBLIC_PATH': JSON.stringify(profile.outputPath),
      }),
      new WriteFilePlugin(),
    ],
    optimization: {
      // minimizer: [
      //   new UglifyJsPlugin({
      //     test: /\.js(\?.*)?$/i,
      //   }),
      // ],
    },
    stats: {
     colors: true
    },
    devtool: env.profile === 'debug' ? 'inline-source-map' : false,
    devServer: {
      contentBase: path.resolve('build/' + env.profile),
      publicPath: '/',
      watchContentBase: true,
      historyApiFallback: {
        index: 'index.html'
      },
      host: '0.0.0.0',
      port: 8885,
      disableHostCheck: true,
      proxy: {
        '/ws': {
          target: 'ws://127.0.0.1:8884',
          ws: true,
          secure: false
        },
        '/api': {
          target: 'http://127.0.0.1:8884',
          secure: false
        },
        headers: {
          'Content-Security-Policy': [
            "default-src *; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'; "
            + "img-src * data: 'unsafe-inline'; connect-src * 'unsafe-inline'; frame-src *;"
          ]
        }
      }
    },
  };

//   if (env['bundle-analyzer'] === 'true') {
//     out.plugins.push(
//       new BundleAnalyzerPlugin({
//         analyzerPort: 8884,
//         openAnalyzer: false
//       })
//     );
//   }

  return out;
}

module.exports = config;
