const glob = require('glob');
const path = require('path');

let entries = {}
glob.sync("./script/app/**/*.js").map(function(file) {
  entries[file.replace(/script\/app\//,'')] = file
})

module.exports = {
  mode: 'production',
  entry: entries,
  output: {
    path: path.join(__dirname, '/dist/assets/js/'),
    filename: '[name]'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['env', {'modules': false}],
              ],
              plugins: ['transform-runtime']
            }
          }
        ],
        exclude: /node_modules/,
      }
    ]
  }
};
