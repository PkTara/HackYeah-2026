![Hack Yeah Logo](assets/readme/hackyeah-logo.svg)
<sup><sub>If you use light mode, I'm sorry for the banner quality. But you deserve it. Screw you.</sub></sup>

# HackYeah 2026

**Climbing Monkey** is a jungle-themed, profile-first climbing app: understand your climbing styles, choose one achievable next action, and grow a monkey companion by taking part. It is built for the [Open: Sport & Healthcare](context/tracks/open-sport-healthcare.md) track. Read the [product design](docs/climbing-app-design.md) and the [alignment analysis](docs/climbing-monkey-alignment.md).

![Climbing Monkey screens: profile, evidence, level up, night mode, log, hands, paused quest, tests](docs/assets/jungle-ui-screens.png)

![Climbing Monkey on phone and desktop: profile, finger close-up, desktop profile with side rail, desktop climb log](docs/assets/jungle-ui-web.png)

## What works

- **Profile loop.** Log climbs (wall angle, controlled or dynamic movement, holds, grade, sent or not). The profile shows a terrain triangle and a style chart, one focus with the evidence behind it, one quest, and the monkey's XP, level and unlocks. Sample data is labelled Example.
- **Movement radar.** Five axes (footwork, balance, tension, stamina, dynos) scored from your own climbs and three home tests (one-leg balance, plank, dead hang): 1 point per sent matching climb, up to 3 for the home test, levels Started, Building and Established. An axis needs 3 matching climbs or its test, otherwise it shows Not enough data with a dashed spoke and the next step to score it. Tap an axis for the records, the rule as a vine, the research behind each signal and its limits. A summary of your records, not a skill test. The rule is in `packages/core/src/movement.ts` and the server's profile (`radar`).
- **Setup.** First-run questions (places, experience, grade, goal, body, connected apps) and six home tests with a stopwatch or rep counter. The guide monkey holds a different prop for each question, and the timer and counter numbers can be tapped to type a result.
- **Hands.** Flag a finger and mark the sore spots; quests that load the fingers pause until it is cleared. A layered hand anatomy viewer and a private hand photo journal (photos need the server).
- **Data hub.** The Data tab groups body and reach, mobility and movement (live camera leg-spread and shoulder-reach assessments, which need the server), strength and endurance (home tests, finger strength read from an external instrument) and activity and recovery. Settings (camera-analysis and hand-photo permissions, sound effects) and About open from here.
- **Demo mode** simulates the profile, health-provider feeds, webcam, pose analysis and photo storage for a presentation. See [Demo mode](#demo-mode).
- **Gazelle mode** (running) and **dolphin mode** (swimming) apply the same loop to other sports: switch pets from the Pets panel on any profile and the app redraws itself as a savanna or an ocean. Each has a log (run type or stroke, where, distance, time), a three-corner profile, one focus, one quest, sore-spot flags that pause quests, and its own XP and unlocks. Both run on one engine (`packages/core/src/sport.ts`) with a definition per sport (`packages/core/src/sports/`). Their data stays on the device; the server does not know these sports yet.
- **Music and sound effects** on the web. See [Music and sound](#music-and-sound).

The [Python/FastAPI backend](backend/README.md) holds the authoritative profile, quest and XP rules, with SQLite storage, private hand photos and optional MediaPipe pose analysis of photos, recorded clips and a sampled live camera. The app saves to it when a server address is set (see [Connecting a backend](#connecting-a-backend)); without one everything stays on the device. See the [camera and video guide](docs/camera-video.md) for the capture flows and the [scientific evidence notes](docs/climbing-scientific-evidence.md) for what the research does and does not support.

A React Native app for **Android, iOS and the web**: one codebase, with a native host for the phones and react-native-web in the browser.

| | Version |
|---|---|
| React Native | 0.84.1 (React 19.2.3) |
| Android | minimum SDK 24, target SDK 36 |
| iOS | 15.1 or later |
| Web | react-native-web 0.21, Vite 8 |
| Android application id | `com.hackyeahapp` |
| Node.js | 22.11+ (tested on 22.22 and 24.14) |

## Repository layout

```
apps/
  mobile/            Native host. One React Native project with two native targets:
    android/           Android project
    ios/               iOS project (needs macOS)
    index.js           Registers @hackyeah/app; nothing else lives here
  web/               Browser host (Vite + react-native-web), renders the same @hackyeah/app
packages/            Shared code, imported as @hackyeah/<name>
  core/              Domain logic. Plain TypeScript: no React, no react-native, no I/O
  data/              Where data lives: the backend contract, on-device storage, HTTP client
  platform/          Capability interfaces + one implementation per OS
  ui/                Jungle pixel UI kit (react-native primitives only, see its README)
  app/               Screens, navigation, root <App/>
  vision/            On-device pose: pull-up counter, dead hang and plank timers, climbing form
                     observations. Plain TypeScript, MediaPipe is passed in. Only its browser
                     harness uses it so far; the app screens do not
backend/             Python/FastAPI server: profile, quests, XP, photos, pose analysis
docs/                Product design, backend design, camera guide, demo guide, research notes
assets/, tools/      Pet sprites and the script that draws them
context/             Hackathon brief, rules and judging criteria (Markdown)
```

Dependencies only flow downwards: `app → ui, data, platform, core`, `data → core, platform` and `ui → core`. `core` and `platform` depend on no other package, and the hosts in `apps/` stay thin. To add another target (a tablet layout, a different web shell, a desktop app), write a new host that renders `@hackyeah/app`. If the target needs different native behaviour, add a `capabilities.<platform>.ts` file in `packages/platform`.

### How platform-specific code is selected

Shared code imports `react-native` and `@hackyeah/platform` normally. Each bundler then picks the right implementation:

| Target | Bundler | `react-native` resolves to | `capabilities` file used |
|---|---|---|---|
| Android / iOS | Metro | `react-native` | `capabilities.ts` |
| Web | Vite | `react-native-web` | `capabilities.web.ts` |

If Android and iOS ever need different code, add `capabilities.android.ts` or `capabilities.ios.ts`; Metro picks those before `capabilities.ts`. Screens read capabilities through `useCapabilities()`, so tests inject fakes with `<App capabilities={...} />`.

### Connecting a backend

Screens only talk to `useGame()`. It saves through a `ClimbingBackend` from `packages/data`: on-device storage by default, or the HTTP API when a server address is set. Endpoints and JSON shapes each live in one file. See [packages/data/README.md](packages/data/README.md).

To use the FastAPI backend, run `npm run backend:setup` once, then `MONKEY_CORS_ORIGINS=http://localhost:5173 npm run backend:start`, and start the web app with `VITE_MONKEY_API_URL=http://127.0.0.1:8000 npm run web`. Without the variable the app keeps everything on the device. Native builds read `API_BASE_URL` in `packages/data/src/config.ts` instead. The same address is used by the camera screens (live leg-spread and shoulder assessments on the Data tab and hand photos on the Hands tab); without a server they say they need one. See the [camera and video guide](docs/camera-video.md).

### Demo mode

Open **Data → Demo controls** and tick **Demo mode**. The controls are also on About, Settings, during setup and on the screen shown when the backend cannot load. Each switch simulates one thing: the sample profile, each health provider, the webcam, pose analysis, hand-photo storage and example home-test and finger-strength readings. With everything ticked the demo needs no backend, webcam, provider account or pose model. Untick **Webcam input** to use a real camera while **Analysis results** stays simulated.

Demo data and server identities are kept apart from your normal profile, and switching demo mode off brings it back. **Reset demo** starts a fresh scenario. The gazelle and dolphin are not part of the demo: their data stays in normal on-device storage. See [the demo guide](docs/demo-mode.md) for every switch and its limits.

### Music and sound

Both are made in code, with no audio files, and play only on the web for now.

- **Music:** an original island loop, synthesised with Web Audio (`packages/platform/src/music`). A small speaker key in the top-right corner of every page, setup included, turns it on. It is off until pressed and remembers the choice; if it was left on, it starts again at the first tap or key press, never by itself.
- **Sound effects:** quiet clicks for buttons, chips and toggles, a soft murmur while the monkey's speech bubble types, and a chime when a climb, a session, a test result, setup or a quest is saved (an arpeggio on a level up). They are generated with [ZzFX](https://github.com/KilledByAPixel/ZzFX) (`packages/platform/src/sfx`) and play well below the music. They are on by default, play nothing before the first tap or key press or while the page is hidden, and can be turned off in **Settings** (remembered on the device).

Music and sound effects share one AudioContext. On Android and iOS the `music` and `sfx` capabilities are undefined, so the music key is hidden and the app is silent (see [Native features](#native-features)).

## Setup

```sh
npm run setup        # installs apps/mobile and apps/web
npm run check        # typecheck + lint + tests (no device or SDK needed)
```

There are deliberately **no npm workspaces**. The Android build expects `node_modules` directly in `apps/mobile` (`android/settings.gradle` loads `../node_modules/@react-native/gradle-plugin`). The shared packages have no dependencies of their own: Metro, Vite, Jest and TypeScript are configured to resolve their imports from the host app.

## Run on the web

```sh
npm run web          # dev server
npm run web:build    # static build in apps/web/dist
```

## Run on Android and iOS

Install the Android SDK and a JDK, or Xcode on macOS, as described in React Native's [environment setup](https://reactnative.dev/docs/set-up-your-environment).

1. Start Metro: `npm start`.
2. **Android:** start an emulator or connect a phone with USB debugging on, then run `npm run android`.
3. **iOS** (macOS only): run `bundle install && bundle exec pod install` in `apps/mobile/ios`, then `npm --prefix apps/mobile run ios`.

Edits to `packages/` or `apps/mobile` hot-reload through Metro.

### Release builds (no Metro needed)

The native builds bundle the JS themselves:
- **Android:** `cd apps/mobile/android && ./gradlew assembleRelease`. The APK is written to `apps/mobile/android/app/build/outputs/apk/release/`.
- **iOS:** open `apps/mobile/ios/HackYeahApp.xcworkspace` in Xcode and choose **Product > Archive**.

### Checking a native build without a device

`npm run check` needs no device or SDK. To confirm that Metro resolves every import for a native build, write a release bundle outside the repository:

```sh
cd apps/mobile
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output /tmp/android.js --assets-dest /tmp/assets
```

Use `--platform ios` for the iOS bundle. Don't write bundles into `android/` or `ios/` by accident.

### Native features

React Native provides the core APIs (`Platform`, `Vibration`, `BackHandler`, `SafeAreaView`, …) on both phones. For anything else, add a native module to the Android and iOS projects and wrap it behind an interface in `packages/platform/src/types.ts`. Implement it in `capabilities.ts`, with a fallback in `capabilities.web.ts`.

Not done on the phones yet:
- **Storage:** `capabilities.ts` uses an in-memory store, so data on Android and iOS is lost when the app closes. Swap it for a persistent store (for example `@react-native-async-storage/async-storage`).
- **Music and sound effects:** a phone needs a native audio library (for example one that plays a rendered loop) wrapped as the `music` and `sfx` capabilities. Until then the music key is hidden and Settings says sound effects are not available.

**Third-party libraries:** a library with native code needs a native rebuild (and `pod install` on iOS), and it won't run in the web host, so keep it behind a capability with a web fallback. Pure-JS libraries work everywhere as they are.

## Notes and troubleshooting

- **SafeAreaView deprecation warning.**
  - RN 0.84 warns that `SafeAreaView` is deprecated. The built-in one needs no extra native dependency, so we keep it and silence that single warning in `apps/mobile/index.js`.
  - To switch to `react-native-safe-area-context`, change `packages/ui/src/components/Screen.tsx` only.
- **Release signing.** Android release builds are signed with the template's debug keystore (`android/app/debug.keystore`). Generate your own key before publishing and never commit it; other `*.keystore` files are gitignored.

## Third-party code

- **ZzFX** by Frank Force, MIT licence ([KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX)). The sound generator from version 1.4.0 is vendored in `packages/platform/src/sfx/zzfx.ts` with its original copyright and licence header. Only the part that builds samples was kept and ported to TypeScript; the sounds are unchanged. The npm package was not used because it creates an AudioContext as soon as it is imported, which browsers block before a tap and which does not exist in Jest or on the phones. The About and Settings pages credit it too.
- **MediaPipe** by Google, Apache-2.0. The backend's optional pose analysis uses the `mediapipe` Python package with a Pose Landmarker model that you download yourself (`POSE_MODEL_PATH`, never committed). The web host depends on `@mediapipe/tasks-vision` for the `packages/vision` harness. See [backend/README.md](backend/README.md) and [packages/vision/README.md](packages/vision/README.md).
- **react-native-camera-kit** and **react-native-permissions**, both MIT, for the camera on Android and iOS. A small patch to camera-kit lives in `apps/mobile/patches/` (see the [camera guide](docs/camera-video.md#native-adapters)).
- **PyAV**, BSD-3-Clause, decodes recorded clips in the backend's optional video extra.
- **[jeremyipark/vision-demos](https://github.com/jeremyipark/vision-demos)**, Apache-2.0: design ideas for the rep counter in `packages/vision`, rewritten in TypeScript rather than copied.

Every other library is listed in `apps/mobile/package.json`, `apps/web/package.json` and `backend/pyproject.toml`.

## AI usage

AI tools were used during development; see [AI_WORKFLOW.md](AI_WORKFLOW.md).
