
![Hack Yeah Logo](assets/readme/hackyeah-logo.svg)
<sup><sub>If you use light mode, I'm sorry for the banner quality. But you deserve it. Screw you.</sub></sup>

# HackYeah 2026

**Climbing Monkey** is a jungle-themed, profile-first climbing app: understand your climbing styles, choose an achievable next action, and grow a monkey companion through consistent participation. Its primary problem brief is [Open: Sport & Healthcare](context/tracks/open-sport-healthcare.md). Read the [product design](docs/climbing-app-design.md) and [alignment analysis](docs/climbing-monkey-alignment.md); product features are currently design proposals, separate from the existing platform scaffold.

A React Native app for **HarmonyOS / OpenHarmony**, built with [React Native for OpenHarmony (RNOH)](https://gitcode.com/CPF-RN/ohos_react_native). The same code also runs on Android, iOS and the web.

| | Version |
|---|---|
| React Native | 0.84.1 |
| RNOH (`@react-native-oh/react-native-harmony`, `-cli`) | 0.84.4 |
| HarmonyOS target / minimum API | 6.0.0 (API 20) / 6.0.0 (API 20) |
| Bundle name | `com.hackyeah.app` |
| Node.js | 22.11+ (tested on 24.14) |

## Repository layout

```
apps/
  mobile/            Native host. One React Native project with three native targets:
    harmony/           HarmonyOS project (open this folder in DevEco Studio)
    android/           Android project
    ios/               iOS project (needs macOS)
    index.js           Registers @hackyeah/app; nothing else lives here
  web/               Browser host (Vite + react-native-web), renders the same @hackyeah/app
packages/            Shared code, imported as @hackyeah/<name>
  core/              Domain logic. Plain TypeScript: no React, no react-native, no I/O
  platform/          Capability interfaces + one implementation per OS
  ui/                Theme tokens and shared components (react-native primitives only)
  app/               Screens, navigation, root <App/>
context/             Hackathon brief, rules and judging criteria (Markdown)
```

Dependencies only flow downwards: `app → ui, platform, core`. `core` depends on nothing, and the hosts in `apps/` stay thin. To add another target (a tablet layout, a different web shell, a desktop app), write a new host that renders `@hackyeah/app`. If the target needs different native behaviour, add a `capabilities.<platform>.ts` file in `packages/platform`.

### How platform-specific code is selected

Shared code imports `react-native` and `@hackyeah/platform` normally. Each bundler then picks the right implementation:

| Target | Bundler | `react-native` resolves to | `capabilities` file used |
|---|---|---|---|
| HarmonyOS | Metro, platform `harmony` | `@react-native-oh/react-native-harmony` | `capabilities.harmony.ts` |
| Android / iOS | Metro | `react-native` | `capabilities.ts` |
| Web | Vite | `react-native-web` | `capabilities.web.ts` |

Screens read capabilities through `useCapabilities()`, so tests inject fakes with `<App capabilities={...} />`.

## Setup

```sh
npm run setup        # installs apps/mobile and apps/web; also applies patches/ via patch-package
npm run check        # typecheck + lint + tests (no device or SDK needed)
```

There are deliberately **no npm workspaces**. RNOH's native build expects `node_modules` directly next to `apps/mobile/harmony`. The shared packages have no dependencies of their own: Metro, Vite, Jest and TypeScript are configured to resolve their imports from the host app.

## Run on HarmonyOS

**Prerequisites:**
- [DevEco Studio](https://developer.huawei.com/consumer/en/deveco-studio/) 6.0 or later, with the HarmonyOS 6.0.0 (API 20) SDK.
- A Huawei developer account, needed for automatic signing.
- An API 20 emulator (DevEco **Device Manager**) or a HarmonyOS device with developer mode on.

### Debug build (JS served live by Metro)

1. Create the local build profile. It holds signing keys, so it is gitignored:
   ```sh
   cp apps/mobile/harmony/build-profile.template.json5 apps/mobile/harmony/build-profile.json5
   ```
2. Start Metro: `npm start`.
3. Open `apps/mobile/harmony` in DevEco Studio and wait for the ohpm and hvigor sync to finish.
4. Click the account icon (top right), then **Sign in**.
5. Go to **File > Project Structure > Signing Configs**, tick **Automatically generate signature**, then click **OK**.
6. Start the emulator, or connect the device.
7. Forward the Metro port to it: `npm run harmony:port` (runs `hdc rport tcp:8081 tcp:8081`).
8. Select the `entry` run configuration and click **Run** (or **Debug**).

Edits to `packages/` or `apps/mobile` hot-reload through Metro.

### Release `.hap` (no Metro needed)

1. Compile the JS to Hermes bytecode: `npm run harmony:bundle`. This writes `harmony/entry/src/main/resources/rawfile/hermes_bundle.hbc`.
2. In DevEco Studio, choose **Build > Build Hap(s)/APP(s) > Build Hap(s)** with the `release` build mode.
3. The `.hap` is written under `apps/mobile/harmony/entry/build/default/outputs/default/`.

### Harmony-specific features

RNOH provides the core React Native APIs (`Platform`, `Vibration`, `BackHandler`, `SafeAreaView`, …) on top of ArkTS system services. For anything else, add an RNOH TurboModule in `apps/mobile/harmony` and wrap it behind an interface in `packages/platform/src/types.ts`. Implement it in `capabilities.harmony.ts`, with fallbacks in `capabilities.ts` and `capabilities.web.ts`.

**Third-party libraries:** a library with native code needs its HarmonyOS port, usually published as `@react-native-ohos/<name>` with an `rnoh0.84` dist-tag. Install it next to the original package; Metro redirects imports automatically. Pure-JS libraries work as they are.

## Run on the web

```sh
npm run web          # dev server
npm run web:build    # static build in apps/web/dist
```

## Run on Android / iOS

`npm run android` needs the Android SDK and a JDK. iOS needs macOS: run `bundle install && bundle exec pod install` in `apps/mobile/ios`, then `npm --prefix apps/mobile run ios`.

## Notes and troubleshooting

- **Node 24 patch.**
  - `@react-native-oh/react-native-harmony-cli@0.84.4` reads `Dirent.path`, which Node 24 removed. This breaks `init-harmony` and autolinking.
  - `apps/mobile/patches/` fixes it (falls back to `Dirent.parentPath`). It is applied automatically on `npm install`.
  - On Node 22 the patch does nothing.
- **Hermes compiler path.**
  - RN 0.84 ships `hermesc` in the `hermes-compiler` package.
  - The RNOH CLI looks in `react-native/sdks`, so `harmony:bundle` passes `--hermesc-dir` explicitly.
- **SafeAreaView deprecation warning.**
  - RN 0.84 warns that `SafeAreaView` is deprecated. RNOH implements it natively on Harmony, so we keep it and silence that single warning in `apps/mobile/index.js`.
  - To switch to `react-native-safe-area-context`, change `packages/ui/src/components/Screen.tsx` only.
- **Signing.** `build-profile.json5` is never committed. Every developer generates their own signature (Setup step 5).

## AI usage

AI tools were used during development; see [AI_WORKFLOW.md](AI_WORKFLOW.md).
