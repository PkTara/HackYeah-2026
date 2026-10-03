const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const packagesRoot = path.resolve(projectRoot, '../../packages');

// Every folder in ../../packages is importable as @hackyeah/<folder>.
const sharedPackages = Object.fromEntries(
  fs
    .readdirSync(packagesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => [
      `@hackyeah/${entry.name}`,
      path.join(packagesRoot, entry.name),
    ]),
);

/**
 * @type {import("metro-config").MetroConfig}
 */
const config = {
  // Shared code lives outside this app, so Metro must watch it too.
  watchFolders: [packagesRoot],
  resolver: {
    extraNodeModules: sharedPackages,
    // Shared packages have no node_modules of their own: resolve their imports
    // (react, react-native, ...) from this app so there is a single copy of each.
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
