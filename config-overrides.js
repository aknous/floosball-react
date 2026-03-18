const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = function override(config) {
  config.resolve = {
    ...config.resolve,
    alias: {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    },
  };

  // Remove fork-ts-checker-webpack-plugin (crashes with TS 5.7+)
  config.plugins = config.plugins.filter(
    plugin => !(plugin instanceof ForkTsCheckerWebpackPlugin)
  );

  return config;
};
