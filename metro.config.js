const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase SDK uses .cjs files that Metro doesn't resolve by default
config.resolver.sourceExts.push('cjs');

module.exports = withNativeWind(config, { input: './global.css' });
