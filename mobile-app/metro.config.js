const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const fs = require('fs');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * When building from a subst drive (e.g. L:\ on Windows to avoid the
 * 260-character path limit), Metro still resolves some modules back through
 * their real C:\ paths. If watchFolders does not include that real folder,
 * the SHA-1 hash lookup fails with "Failed to get the SHA-1 for: C:\...".
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const realRoot = fs.realpathSync.native(__dirname);
const config = {
  watchFolders: realRoot.toLowerCase() !== __dirname.toLowerCase() ? [realRoot] : [],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
