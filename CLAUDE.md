# HackYeah 2026 project

Hackathon project for HackYeah 2026 (3–4 Oct 2026, Kraków). **Submission deadline: 11:00 PM, 4 October 2026.**

Read `context/00-OVERVIEW.md` first. It has the track comparison, prizes, judging weights, the submission checklist and the known inconsistencies in the materials.

- Per-track details are in `context/tracks/*.md`. Original PDFs are in `context/source-pdfs/`.
- The submission form constraints are in `context/ProjectSubmissionUpload.md`:
  - title of 5 words or fewer
  - description of 500 words or fewer
  - PDF deck of 10 slides or fewer
  - video of 60 seconds or less
- Team members must be able to explain and defend every part of the code, including AI-generated parts. Keep the architecture understandable.
- Record significant AI tools, external models, APIs and libraries as they are used; every track requires disclosure. `AI_WORKFLOW.md` is the disclosure log: append to it after significant work.

## Codebase

- **Backend:** `backend/` is Python 3.12–3.13 + FastAPI/Pydantic + SQLite, with optional MediaPipe Tasks image analysis. Setup/API notes: `backend/README.md`; design: `docs/backend-design.md`. Use Canon TDD: one behavior, observed red, minimal green, regression. Run `npm run backend:check` after backend virtualenv setup. Authoritative profile/quest/XP rules live in Python; clients consume API output. Do not store runtime databases, tokens, photos or model binaries in Git.

Climbing Monkey's track and product brief is **Open: Sport & Healthcare** (see `context/tracks/open-sport-healthcare.md` and `docs/climbing-monkey-alignment.md`). The product is profile first: connect climbing/activity evidence to an understandable profile and one achievable next action. The app is React Native 0.84.1 for Android and iOS (`apps/mobile`) and the web (`apps/web`, react-native-web + Vite). The README covers setup and layout.

- **Shared code lives in `packages/`** and is imported as `@hackyeah/<name>`. Hosts in `apps/` stay thin.
  - `core`: pure TS, no React or react-native.
  - `data`: the `ClimbingBackend` contract, on-device backend and HTTP backend. Endpoints in `endpoints.ts`, JSON shapes in `wire.ts`.
  - `platform`: capability interfaces + `capabilities.ts` (Android, iOS) / `capabilities.web.ts`.
  - `ui`: jungle pixel UI kit; everything is drawn with Views (no SVG, images or font files).
  - `vision`: on-device pose counters (pull-ups, dead hang, plank) and climbing-form observations. Pure TS with no react-native or MediaPipe import; the host passes the pose landmarker in. See its README.
  - `app`: screens, navigation, `<App/>`.
- **Screens never fetch.** They use `useGame()`; data goes through the backend in `packages/data`.
- **Platform-specific code** goes in `packages/platform` as `*.web.ts` siblings (or `*.android.ts` / `*.ios.ts` if the phones differ), behind an interface in `types.ts`. Don't use `Platform.OS` branches in screens.
- **No npm workspaces.** Each app has its own `node_modules`. Metro, Vite, Jest and tsconfig all resolve shared-package imports from the host app.
- **Native libraries** need a native rebuild and won't run in the web host, so put them behind a capability with a web fallback. Prefer pure-JS solutions where possible.
- **Commands** (run from the repo root):
  - `npm run check`: typecheck + lint + tests.
  - `npm start`: Metro.
  - `npm run web`: web dev server.
  - `npm run web:build`: production web build.
  - `npm run android`: build and launch on Android (Android SDK needed). iOS: `npm --prefix apps/mobile run ios` on macOS.
- **Verifying without a device:** `cd apps/mobile && npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output <tmp>/android.js --assets-dest <tmp>/assets` confirms Metro resolves everything for a native build. Don't write bundles into `android/` or `ios/` by accident.
- **Editing generated code:** `apps/mobile/android` and `apps/mobile/ios` come from the React Native template (`@react-native-community/cli init`). Edit Kotlin/Swift there only for native features (Turbo Modules).
