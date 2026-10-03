// Vite config for the vision harness. No imports from npm packages, so it runs
// with the Vite that apps/web already installs:
//
//   node apps/web/node_modules/vite/bin/vite.js --config packages/vision/harness/vite.config.mjs
//
// @mediapipe/tasks-vision also comes from apps/web/node_modules (it is a
// dependency of the web host). Its WASM folder is served as this page's
// public directory, so nothing is loaded from a CDN except the model file.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const tasksVision = path.join(repoRoot, 'apps/web/node_modules/@mediapipe/tasks-vision');

export default {
  root: here,
  publicDir: path.join(tasksVision, 'wasm'),
  resolve: {
    alias: {
      '@hackyeah/vision': path.join(repoRoot, 'packages/vision/src'),
      '@mediapipe/tasks-vision': path.join(tasksVision, 'vision_bundle.mjs'),
    },
  },
  server: { fs: { allow: [repoRoot] } },
  build: { outDir: path.join(here, 'dist'), emptyOutDir: true },
};
