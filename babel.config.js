module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Must be last — required for react-native-reanimated (e.g. FadeIn on awards reveal).
    plugins: ['react-native-reanimated/plugin'],
  };
};
