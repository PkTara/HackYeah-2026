module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-camera-kit|react-native-permissions)/)',
  ],
  // Run the shared packages' tests too.
  roots: ['<rootDir>', '<rootDir>/../../packages'],
  moduleNameMapper: {
    '^@hackyeah/([^/]+)$': '<rootDir>/../../packages/$1/src',
  },
  // Shared packages have no node_modules; resolve their imports from this app.
  modulePaths: ['<rootDir>/node_modules'],
  modulePathIgnorePatterns: [
    '<rootDir>/harmony/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
};
