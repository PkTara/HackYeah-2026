# apps/mobile

The native host for Android (`android/`) and iOS (`ios/`). It only registers `@hackyeah/app` (see `index.js`); the app itself lives in `../../packages`. The web host in `../web` renders the same app with react-native-web.

For setup, running and release builds, see the [root README](../../README.md).

**Config files that make the shared packages work:**
- `metro.config.js`: `watchFolders`/`extraNodeModules` for `../../packages`, with their imports (react, react-native, ...) resolved from this app's `node_modules`.
- `tsconfig.json` and `jest.config.js`: map `@hackyeah/*` to `../../packages/*/src`.
