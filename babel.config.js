module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Must be last — required for react-native-reanimated.
    // (In Reanimated 4 the plugin lives in `react-native-worklets`. The
    // legacy `react-native-reanimated/plugin` is a one-line re-export of it
    // so either name works; we use the new name per migration guide:
    // https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x)
    plugins: ['react-native-worklets/plugin'],
  };
};
