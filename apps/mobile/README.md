# apps/mobile

The native host for HarmonyOS (`harmony/`), Android (`android/`) and iOS (`ios/`). It only registers `@hackyeah/app` (see `index.js`); the app itself lives in `../../packages`.

For setup, running and release builds, see the [root README](../../README.md).

**Config files that make the shared packages work:**
- `metro.config.js`: RNOH resolution for `harmony`, plus `watchFolders`/`extraNodeModules` for `../../packages`.
- `tsconfig.json` and `jest.config.js`: map `@hackyeah/*` to `../../packages/*/src`.
- `patches/`: Node 24 fix for `@react-native-oh/react-native-harmony-cli`, applied on `npm install`.
