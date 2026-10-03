module.exports = {
  preset: 'react-native',
  // Run the shared packages' tests too.
  roots: ['<rootDir>', '<rootDir>/../../packages'],
  moduleNameMapper: {
    '^@hackyeah/([^/]+)$': '<rootDir>/../../packages/$1/src',
  },
  // Shared packages have no node_modules; resolve their imports from this app.
  modulePaths: ['<rootDir>/node_modules'],
  modulePathIgnorePatterns: ['<rootDir>/android/', '<rootDir>/ios/'],
};
