const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend (wa-sqlite) ships a .wasm file that Metro
// must treat as an asset, not a source module, to resolve on web.
config.resolver.assetExts.push('wasm');

module.exports = config;
