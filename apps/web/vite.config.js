import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, '../..');
const packagesRoot = path.join(repoRoot, 'packages');

// Every folder in ../../packages is importable as @hackyeah/<folder> (same as Metro).
const sharedPackages = Object.fromEntries(
  readdirSync(packagesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => [
      `@hackyeah/${entry.name}`,
      path.join(packagesRoot, entry.name, 'src'),
    ]),
);

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    // Globals some React Native libraries expect.
    __DEV__: JSON.stringify(mode !== 'production'),
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      ...sharedPackages,
    },
    // Prefer web-specific implementations, e.g. capabilities.web.ts.
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.mjs',
      '.json',
    ],
    // Shared packages have no node_modules; always use this app's copies.
    dedupe: ['react', 'react-dom', 'react-native-web'],
  },
  server: {
    fs: { allow: [repoRoot] },
  },
  build: {
    // Keep /*! and @license comments so third-party licences (ZzFX, React)
    // ship with the minified bundle.
    rolldownOptions: { output: { legalComments: 'inline' } },
  },
}));
