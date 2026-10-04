# AI Workflow

Use this file for significant AI/external-resource disclosure in the Sport & Healthcare submission. Keep it updated as the project evolves: record each significant AI-assisted step, what was generated, and how it was checked. Remove API keys, credentials and personal data before publishing.

## Tools used

| Tool | Model | Used for |
|---|---|---|
| Claude Code (VS Code extension) | Claude Opus 5.5 (`claude-opus-5-5`) | Converting the challenge PDFs to Markdown, researching the React Native setup, scaffolding the project, writing code and docs |
| Codex desktop | GPT-6 | Drafting the climbing app product design and checking MediaPipe capability documentation |
| Codex (with subagents) | GPT-6.1 Sol, reviewed by GPT-6 Astra | The FastAPI backend, its video and live camera APIs, the first camera adapters and capture screens, and the scientific evidence notes, demo mode and the Data hub with live assessments (log entries 11, 20, 27 and 28), and the decision evidence work merged in log entry 35 |
| Claude Code (claude.ai cloud session, with parallel subagents) | Claude | Pixel-art pets, the jungle pixel UI kit, the climbing profile rules, the app screens, the web layout, onboarding, connecting the app to the backend, and the camera screens |

### Third-party code in the app

| Code | Licence | Where | Used for |
|---|---|---|---|
| ZzFX 1.4.0 by Frank Force ([KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX)) | MIT | `packages/platform/src/sfx/zzfx.ts`, vendored with its copyright and licence header | Generating the sound effects in code (log entry 25) |

The Codex design-drafting step used the `superpowers:using-superpowers` and `superpowers:brainstorming` skills, plus web browsing of official MediaPipe documentation.

## AI features in the app

**Live camera assessments (server-side pose).** The Data tab's leg spread and shoulder reach assessments send sampled live camera frames to the FastAPI backend, which runs MediaPipe Pose Landmarker (a Google model, Apache-2.0, configured with `POSE_MODEL_PATH` and not in Git). Leg spread is the angle between the legs; shoulder reach is the hip, shoulder and elbow angle on each side, with a straight-arm check.
- Inference flow: remote, on the team's own server. Nothing goes to a third-party service.
- Data sent and stored: frames leave the device only if the climber turns on camera analysis, once, in setup or Settings; the panel says that frames go to the server for analysis. The server analyses them in memory and keeps no frames. A result is stored only when the climber reviews it and presses Save, as their own report.
- Limitations and failures: a projected 2D angle, not a validated flexibility test; camera height, angle and clothing change it, and the screen says so. Frames without the needed joints return a reason and no number. Without a model the server answers 503 and the screen says so. Without a server the Data tab says the camera needs one and never shows a result. Demo mode can simulate the webcam and the analysis instead (log entry 28).
- Validation: unit tests with a fake server, backend tests with real decoding, and browser runs against the real model (log entries 21 and 28). Not yet compared with a measured angle.

**Hand photos** are not analysed by any model: they are kept privately on the server with the climber's own entry, only while the separate hand-photo permission (setup or Settings) is on.

`packages/vision` (on-device pose counting, log entry 18) is not wired into the screens yet.

## Log

### 1. Hackathon context (2026-10-03)

**Prompt:** "Look through the hackathon context files - convert PDFs to LLM-friendly files … Extract useful information."

**Output:** `context/00-OVERVIEW.md` and `context/tracks/*.md`.

**Validation:**
- The PDFs were extracted with `pdftotext` and the text was read in full.
- The agent flagged inconsistencies in the source material: a duplicated SmartCity PDF and conflicting AI Control Layer weights.

### 2. Project scaffold (2026-10-03)

**Prompt:** Set up a React Native mobile app: "modularise so that it can be adapted to other formats if possible."

**What the agent did:**
- **Research.** Queried npm and read package sources to choose the React Native version (0.84.1).
- **Scaffold.** Ran `@react-native-community/cli init` (RN 0.84.1), which generated the Android and iOS projects.
- **Designed and wrote the modular structure.**
  - Shared packages: `packages/{core,platform,ui,app}`.
  - Thin hosts: `apps/mobile` and `apps/web`.
  - Per-platform capability files: `.ts` (Android, iOS) / `.web.ts`.

**How the output was validated:**
- `tsc --noEmit`, ESLint and Jest (8 tests: domain reducer, App rendering, navigation, haptics through injected capabilities) all pass.
- A native release bundle builds.
- The Android bundle resolves the default `capabilities.ts`.
- The web production build was rendered in jsdom: it shows "Running on Web browser" and the counter responds to clicks, with no runtime errors.
- Not yet verified: building the native app and running it on an emulator or device.

**Approaches that didn't work:**
- Rendering the web build in headless Edge: blocked by the sandbox.
- Vite SSR as a substitute: hit a CommonJS/ESM interop error in a react-native-web dependency.
- Both were replaced by the jsdom check above.

### 3. Climbing app design draft (2026-10-03)

**Prompt:** Start a Markdown design document for a React Native climbing profile app using physical tests, pose tracking, external activity/health data, hand photos and recovery tracking, with possible form coaching and a guided pain walkthrough.

**Output:** `docs/climbing-app-design.md`. The draft organizes the idea into a core profile and hand journal, proposed hackathon scope, platform boundaries, and optional extensions. No app features or inference models were implemented in this step.

**Validation:** Read the existing repository architecture and hackathon context; checked Google's official Pose Landmarker and Hand Landmarker guides; reviewed the draft for scope consistency and distinctions between camera estimates, measured performance, symptom reports and medical conclusions. Native inference feasibility and clinical content remain unvalidated.

### 4. Visual profile design and delegated research (2026-10-03)

**Prompt:** Add a clear radar/triangle profile for terrain and movement styles, research further features with an agent, and have another agent review the supplied context. The user confirmed profile-first direction so people can understand their performance and act on it.

**Output:** Expanded `docs/climbing-app-design.md` and added `docs/assets/climbing-style-profile.svg`, an illustrative concept sketch. Two user-requested agents researched feature candidates using primary sources and reviewed repository hackathon requirements. The draft includes independent terrain axes, a movement radar, controlled/dynamic indicators, an optional combined grid, evidence rules and action flow.

**Validation:** Reviewed agent findings against the draft; kept chart/scoring proposals separate from validated grade estimates; recorded research sources and missing-data behavior. The SVG is a concept with example values. No scoring model, native feature or clinically reviewed guidance was implemented.

### 5. Companion pet and personalized quests (2026-10-03)

**Prompt:** Add a pet that levels up through gamification and assigns improvement activities, such as stretches, based on profile weaknesses.

**Output:** Added companion progression, evidence-linked quest selection, visual quest presentation, proposed XP rules, data boundaries and a small demo scope to `docs/climbing-app-design.md`.

**Validation:** Reviewed consistency with the profile-first direction, missing evidence and symptom constraints. Pet XP remains separate from assessed ability. Exercise content requires review; no exercise routine, pet asset or app code was generated in this step.

### 6. Climbing Monkey identity (2026-10-03)

**Prompt:** Name the app Climbing Monkey and add jungle theming.

**Output:** Updated the design title, product description, monkey companion and visual identity requirements; aligned the profile concept sketch's title and surface colors.

**Validation:** Checked that jungle decoration preserves chart clarity, accessible controls and straightforward symptom reporting. Final character artwork and app styling are not implemented.

### 7. Sport & Healthcare extraction and alignment (2026-10-03)

**Prompt:** Align the design with supplied context, extract useful sports content into an open-track document, assess alignment and suggest improvements.

**Output:** `context/tracks/open-sport-healthcare.md`, `docs/climbing-monkey-alignment.md`, and updates to the design, shared open-track context, overview, repository guidance and README. Sport & Healthcare is the primary product brief.

**Validation:** System `pdftotext` was unavailable, so bundled `pypdf` extracted all four description pages and all three rules pages. The context-review agent independently read both PDFs and checked requirements, judging weights and alignment gaps. Matched general upload constraints separately; retained platform/start-time source discrepancies. Reviewed local links and whitespace. No product implementation or claimed user study was added.

### 8. Pixel-art pets (2026-10-03)

**Prompt:** "Create cute little pixel art pets/mascots for: climbing monkey, running gazelle."

**Output:** `tools/pixel_pets.py` draws both pets as text pixel grids and renders SVG, PNG, animated GIF and sprite sheets into `assets/pets/`. The monkey later became the app companion and the gazelle the locked running-mode pet.

**Validation:** Rendered previews were inspected and redrawn until they read clearly at small sizes (the first gazelle looked like a dog and was rebuilt with chibi proportions).

### 9. Jungle pixel UI (2026-10-03)

**Prompt:** "Cook up a jungle UI. No LLM artifacts, no claudeisms, no em dashes. Just good old human, intuitive, bold design. Pixel and game shit." Follow-ups: reuse the earlier sprites, and use subagents where possible.

**What the agent did:**
- **Pixel engine (`packages/ui/src/pixel`).** Sprites are strings with one character per pixel. `gridToRects` merges pixels into rectangles and `PixelArt` draws one `View` per rectangle, so there are no images, SVG or font files to bundle for each platform. Includes a 5x7 bitmap font, a procedural jungle scene (day and night) and rasterised radial charts.
- **UI kit (`packages/ui`).** Stepped-corner panels with wooden title tabs, press-down buttons, chips, XP meter, climb pips, tags, the animated monkey (idle, blink, cheer, two level-up cosmetics) and the locked gazelle, a tab bar, and a day/night theme. See `packages/ui/README.md`.
- **Profile rules (`packages/core`).** Climb logs, terrain and movement tallies, the focus rule (fewer than 3 logs means "log more", never "weak"), a draft quest library with finger-flag pausing, XP from unique completed quests (10 XP each, a level every 50), and labelled sample data. Replaced the counter example.
- **Screens (`packages/app`).** Profile (hero scene where the monkey climbs one hold per quest, focus, quest, flags, terrain triangle, movement, recent climbs, pet roster), Log, Hands, Tests, Evidence and About, with persistence through the existing storage capability.
- **Subagents.** Four ran in parallel: the Log screen, the Hands screen, the Tests/Evidence/About screens, and unit tests for the pixel engine. Each had file-level ownership and the same style and copy rules, and the orchestrating agent reviewed their output and screenshots. Their reviews also caught real issues that were then fixed: a lost-update race in the local backend, low contrast on red in dark mode, and selected states that web screen readers could not hear.

**How the output was validated:**
- `npm run check` (typecheck, lint, Jest) passes.
- The pixel engine has 261 unit tests, including a lossless check that rebuilds 53 pictures from their rectangles. The test agent seeded 34 deliberate bugs into a scratch copy to confirm the tests catch them, and found two real ones (chart fill half a pixel off its outline, a possible gap in the sky at some heights), which were then fixed.
- Every screen was rendered in Chromium through the web host at phone width, in light and dark mode, and inspected from screenshots.
- A native release bundle builds.
- Not yet verified: running on a phone or emulator, and performance with the number of Views the pixel art uses (about 3,400 on the profile in the web build).

**Honesty notes:** sample climbs are labelled "Example"; the movement radar shows example values and says it is not scored; quest text is a draft that needs coach review; the hand journal says it is not a diagnosis.

### 10. Backend-ready data layer (2026-10-03)

**Prompt:** "Ensure the frontend is modular so that it can connect to a backend (and so when we know what the endpoints and shit are for the actual version, we can connect easily)."

**Output:** `packages/data` with a `ClimbingBackend` contract, an on-device backend (the demo) and a fetch-based HTTP backend. Endpoint paths live in `endpoints.ts` and JSON shapes in `wire.ts`, both marked as placeholders. `useGame()` applies each change on screen, saves it through the backend, and on failure reloads the saved state and shows a notice. See `packages/data/README.md`.

**Validation:** Jest tests run the HTTP backend against a fake server (paths, methods, bodies, auth header, error handling) and the local backend against the memory store (persistence, same-tick saves, corrupt data). An app test forces a failed save and checks the rollback. The native release bundle includes the new package. No real API exists yet, so the HTTP backend has only been tested against the fake server.

### 11. Python/FastAPI backend through TDD (2026-10-03)

**Prompt:** Branch off, design and implement a Python/FastAPI backend with relevant pose-tracking libraries; set up testing first and use TDD for behavior, delegating where useful.

**Output:** Feature branch `codex/climbing-monkey-backend`; `backend/` service, pytest/HTTPX harness, dependency constraints, Ruff configuration, CI workflow, root backend commands and backend design/setup/TDD notes. APIs cover anonymous bearer profiles, climbing/assessment/activity/hand records, descriptive style summaries, assessment trends, private photos, historical discomfort maps, quest eligibility, pet progression, export/deletion and optional MediaPipe image/landmark analysis.

**Tools and libraries:** Codex used Canon TDD, planning, TDD, subagent development/review and verification skills. GPT-6.1 Sol agents implemented profile and pose modules in isolated file ownership; a GPT-6 Astra agent reviewed profile and backend correctness. Runtime libraries are FastAPI/Pydantic, SQLite (standard library), Pillow and optional MediaPipe Tasks/NumPy; tests use pytest, HTTPX, coverage and Ruff. Exact tested versions are in `backend/constraints.txt`.

**Validation:** Observed behavioral red → green cycles and passing characterization cases are summarized in `docs/backend-tdd.md`. Tests use actual temporary SQLite and HTTP validation. Independent review found omitted camera confidence, stale assignment/preferences under concurrent writes and nonfinite error serialization; each finding was reproduced in a failing regression test and fixed. A separate core-only environment verifies optional inference dependencies are not necessary for the basic service. A real localhost HTTP smoke covers the connected loop; real MediaPipe inference on an official public sample succeeded outside the macOS sandbox. Root frontend typechecking and eight tests passed; the existing lint scanned generated native build files and failed independently of these changes.

**Privacy and limitations:** Tokens are hashed at rest. Uploaded pose images are transient; retained hand photos require explicit upload/retention consent, are normalized without EXIF and remain owner-bound. Confirmed camera assessments are user reports, not independently verified measurements. No model binaries, personal records or runtime database are committed. Native MediaPipe initialization aborts inside this macOS sandbox but succeeds outside it. No production deployment, real provider OAuth, medical diagnosis, healing prediction or reviewed stretching prescription was implemented.

**Final backend checks:** 114 tests passed with 99% statement coverage; Ruff and dependency checks passed. Fresh core-only installation: 112 tests passed, two optional MediaPipe-container tests skipped. Independent scoped re-review approved the fixes. The local HTTP smoke passed against 22 documented paths. The backend branch has not been deployed.

### 12. Phone and desktop web layout (2026-10-03)

**Prompt:** "Make it work on browser too - currently format is just for mobile. Make it react native - web UI support as above."

**Output:** The same React Native screens adapt to the window. From 760px wide a wooden side rail replaces the bottom tab bar; when two 360px columns fit, screens split into two columns (`useLayout`, `Columns` and `Column` in `packages/ui/src/layout.tsx`). Buttons, chips, tabs and rail items show hover and keyboard focus on the web.

**Validation:** Screenshots at 360, 390, 1024 and 1440px, light and dark, from Chromium; phone layouts were checked to be unchanged. Typecheck, lint and Jest pass.

### 13. Finger close-up and warning sign (2026-10-03)

**Prompts:** "For the hand check, make sure you can click on the specific part of the hand - have another view, where you can click on the pulley/tendon/finger segment that hurts." Then: add a pixel danger sign to the "this is your own note" disclaimer.

**Output:** Tapping a finger on the Hands screen opens a close-up with three layers (segments and joints, pulleys, tendons). Spots are saved with the flag (`packages/core/src/spots.ts`), shown in plain words ("A2 pulley"), and an empty list means "sore, not sure where". A pixel warning sign marks the not-a-diagnosis notes.

**Validation:** Spot ids and labels have unit tests; saved flags from before spots existed still load. Screens were checked in the browser on phone and desktop widths.

**Honesty notes:** It records where the climber says it hurts. It does not diagnose, and the copy says to stop and see a physio or doctor after a pop, swelling, bruising or pain bending the finger.

### 14. Climb style and hold types (2026-10-03)

**Prompt:** "Change 'Moves' in 'log a climb' to 'Style' and also let it be multi-select since you can have both in a single climb. Add another field for hold-type."

**Output:** A climb now has one or both styles (controlled, dynamic) and optional hold types (jug, crimp, sloper, pinch, pocket, volume). Tallies count a two-style climb under each style. Climbs saved in the old one-style shape are upgraded when loaded.

**Validation:** Unit tests for the tallies and the upgrade of old saves; sample data updated and labelled as an example.

### 15. Monkey-led onboarding (2026-10-03)

**Prompts:** "Wireframe an onboarding process in the style of the current UI - first log in, fill in details and connect to other apps (like Strava etc). Request the user to optionally do diagnostic tests (say smth like it'll take 5-10 mins)... Progressively led through onboarding - no overwhelming lots of info - just step by step." and "The monkey should lead you through the onboarding process, have speech bubbles, and hop around."

**Output:** A seven-step setup, one question per screen: where you climb, how long, usual grade, goal, optional reach, optional apps, and six optional home tests (dead hang, pull-ups, sit and reach, plank, one-leg balance, push-ups) with a stopwatch or rep counter. The monkey hops between vines and speaks in a typed-out speech bubble (`MonkeyGuide`, `SpeechBubble` in `packages/ui`). Setup runs on first launch; skipping is remembered, it can be run again from the Tests tab, and each home test can be redone there on its own.

**Validation:** Jest covers the flow (required answers, skips, results, back navigation, copy rules), the first-launch gate, the saved answers, and the reducer rules for results. Every step was screenshotted at 360, 390 and 1440px, in dark mode and with reduced motion.

**Honesty notes:** App connections are demo only: the consent screen says this build cannot connect yet, and a connected app is tagged "Demo". Test results are self-reported, never scored, and the test text is a draft that needs coach review. No new libraries, models or APIs.

### 16. App connected to the FastAPI backend (2026-10-03)

**Prompts:** "Also there's a new backend 'origin/codex/climbing-monkey-backend'" and "Double-check that we aren't completing extra work - has Codex already cooked the backend? If it has, then don't do unnecessary work - handle the agents."

**Output:** The Codex backend branch was merged as is. A planned second Python vision service was dropped because the backend already handles server-side pose. Backend: climbs take one or both styles, hold types and optional attempts; hand reports take spots and an optional pain rating (all optional, old clients keep working). Client: `packages/data` talks to the real `/v1` routes with an anonymous device token, keeps setup answers on the device, and reads the state back after each change so the server's quest shows straight away. Quests and XP come from the server when it is connected; the on-device demo keeps its own quest library.

**Validation:** Canon TDD for the backend: 11 new tests and 14 rejected-input cases, each seen failing first; 137 backend tests pass and Ruff is clean. 33 client tests run against an in-memory fake of the routes. A Playwright run against the real server checked that climbs, flags, quest XP and setup answers come back after a reload (12 checks). No new libraries, models or APIs.

### 17. Hand anatomy viewer and breadcrumbs (2026-10-03)

**Prompts:** "Give a slider for hands - so we have a medically accurate skeleton view, muscle view, and tendon view. On a finger segment being pressed, it'll label and explain that specific segment." Then: "Add breadcrumbs for the hand bit... keep breadcrumb position consistent... The 'sore don't know where' should be in the same tray, and where things are linked, there should be in the same tray but with dividers if necessary."

**Output:** A palm-side hand drawn in code with three layers (skeleton, muscle, tendon and pulleys), 93 tappable parts, and a slider between layers. Each part has its name, plain words, what it is and why climbers care. Breadcrumbs sit top-left on every pushed screen and follow where a screen belongs, not the history. The finger close-up is one tray split by dividers, with "Sore, not sure where" next to the spot picker.

**Validation:** Unit tests check the content and the drawing (tendons end on the right bones, each pulley sits over its bone or joint, carpals in order), the slider's keyboard and screen-reader behaviour, and the breadcrumb trails. Screens were checked at 360, 390 and 1280px in light and dark.

**Sources and honesty notes:** Content follows standard references (Gray's Anatomy 42nd ed., Netter's Atlas, Moore's Clinically Oriented Anatomy; Doyle 1988 and Doyle and Blythe 1977 on pulleys; Schweizer 2001 and 2003, Vigouroux et al. 2006, Schoeffl et al. 2003 on climbing loads and injuries). These were cited from the model's knowledge, not re-read, and the drawing is schematic. A physio or anatomist should review it before release.

### 18. On-device pose counters (2026-10-03)

**Prompts:** "Spawn an agent to work on a backend module for camera stuff - we want to have computer vision (try https://github.com/jeremyipark/vision-demos)" and "The computer vision stuff is for analysing climbing form, and also we need computer vision stuff for analysing pullups for the test and plank time etc."

**Output:** `packages/vision`, plain TypeScript that runs on the device: a pull-up counter, dead hang and plank timers, and descriptive climbing-form observations from pose landmarks (no grades). A capture that is too poor returns a reason and no number, so it can never be saved as a score. The web host passes in MediaPipe Pose Landmarker; the package itself imports neither MediaPipe nor react-native. It is not wired into the app screens yet.

**External code and models:** `@mediapipe/tasks-vision` 1.0.1 (Apache-2.0) in `apps/web`; MediaPipe Pose Landmarker models (Apache-2.0), downloaded at runtime and not committed. Design ideas from jeremyipark/vision-demos (Apache-2.0), rewritten rather than copied and credited in the source.

**Validation:** 55 unit tests on synthetic poses, a 40-seed stress run at 15 and 30 fps with jitter, a native release bundle check, and headless-browser runs with real MediaPipe on one public photo.

**Privacy and limitations:** Pose detection runs on the device, but the MediaPipe web runtime sends usage metrics to Google; this must be disclosed or blocked before the camera feature ships. Thresholds have not been compared with a person counting or timing by hand, and speed on phones is unknown. A Python service using a hosted vision API was tried and removed without being called (no key, and the backend already had pose).

### 19. Submission image (2026-10-03)

**Prompt:** "Generate 'The visual image of the idea - we recommend adding one image describing the idea/project'", then higher resolution and changes to the wording.

**Output:** `docs/assets/climbing-monkey-idea.png`, 3840x2160: four real app screens (setup, log, profile, data) captured in Chromium, framed and labelled with the app's own pixel font and monkey sprite on an HTML page rendered by Playwright. No image-generation model was used.


### 20. Live cameras, video and scientific evidence (2026-10-03)

**Prompt:** Support videos and live previews with snapshots where an image is required; research scientific citations, including climbing and Keith Baar work, for another agent to integrate into the main app.

**Output:** PyAV/MediaPipe VIDEO-mode clip and WebSocket APIs; browser and native live previews/snapshots; browser clip recording; consent/review/retake/confirmed-save capture screens; native permissions and scoped media cleanup; camera/video setup guide; `docs/climbing-scientific-evidence.md` with 12 original studies, stable IDs, claim boundaries, safe copy and JSON citation examples.

**Delegation:** GPT-6.1 Sol agents implemented backend video, native adapters, capture UI and the scientific handoff in separate file ownership. A GPT-6 Astra agent reviewed backend, evidence, native/capture integration and scoped cleanup fixes. Canon TDD supplied observed red/green cycles for new behavior; already-covered boundaries were retained as characterization tests.

**Libraries/resources:** PyAV 16.1.0, websockets 16.1.1, MediaPipe Tasks VIDEO mode and NumPy; react-native-camera-kit 17.0.0, with a small patch (applied by patch-package) so its camera view copies React's frozen props instead of changing them; react-native-permissions 5.4.4. A temporary Playwright headless browser and fake camera were used for verification; no real camera or personal media was accessed. Model and public sample assets stayed outside Git.

**Validation:** Real encoded MP4/WebM/MOV fixtures, real 1080p H.264 MOV model inference, live-session inference and browser-to-Uvicorn integration passed. The browser verified local preview/no upload before consent, snapshot analysis, clip review/analysis, sampled live results and private hand-journal saving; its synthetic profile was deleted. Code review found and TDD regressions fixed streaming-token revocation, external demux references, missing timestamps and browser error URL leaks. Browser smoke also exposed the missing Uvicorn WebSocket runtime, which is now a declared dependency. JS typechecking, mobile tests, targeted lint, production web build and platform bundles were checked; exact final counts are in `docs/camera-video.md`.

**Scientific limits:** Camera leg-spread geometry remains an unvalidated 2D estimate. Baar-related engineered-tissue schedules, small biomarker trials and single-athlete cases are not climbing prescriptions. Dossier entries identify population, methods, reading depth and limits. The citations have not yet been installed as main-app evidence components.

**Native/runtime limits:** Physical device cameras, runtime permission dialogs and Android and iOS native builds were not available. JS bundles do not establish native build success. Android and iOS expose snapshot and live-frame workflows; the web also records clips. This Mac's restrictive sandbox can abort MediaPipe native initialization; PyAV/OpenCV emit a duplicate FFmpeg Objective-C class notice outside it, though smoke tests succeeded. Existing native credential storage remains in-memory; production setup is separate work.

### 21. Camera screens in the app (2026-10-03)

**Prompt:** "Integrate origin/codex/climbing-monkey-backend with our frontend - our frontend may need to be extended to accommodate for the backend. Ensure there is a frontend for the camera app bit. May need to extend backend and also extend the frontend. Use TDD for the backend." Earlier: do not duplicate existing work, and keep the app to Android, iOS and the web.

**Output:**
- The backend branch's video work was merged (merge commit on this branch), keeping only its Android, iOS and web parts. Its own capture screen, written for the old starter app, was replaced.
- `packages/data`: `media.ts` (photo and clip analysis, confirmed camera results, private hand photos), `live.ts` (the live WebSocket session with one frame in flight), routes in `endpoints.ts` and JSON in `wire.ts`. It shares the HTTP backend's anonymous token and never makes its own climber. One server address for everything (`VITE_MONKEY_API_URL`, `API_BASE_URL`); the separate camera default was dropped.
- `packages/platform`: the web and Android/iOS camera adapters became a `camera` capability. The unused system-recorder path was removed.
- `packages/app`: a camera assessment screen (Tests tab, replacing the "Leg spread, Soon" card) and a hand photo screen (Hands tab and the finger close-up), in the jungle UI kit with breadcrumbs and trays. A finger entry feeds the existing finger flags and keeps the marked spots. In the on-device demo both say they need the server.
- No backend change was needed.

**Validation:** Jest: 19 capture tests (consent, review and retake, 30 second clips, live backpressure and close, background and permission states, late answers, cleanup, 503), 6 App-level entry tests, 16 media and 6 live client tests; `npm run check` passes. Backend: 197 tests and Ruff pass with the video extra. Android and iOS release bundles build. Playwright with Chromium's fake camera, fed a public MediaPipe sample photo, ran every flow at 390 and 1280 px against the real backend with the official Pose Landmarker lite model and a temporary database (31 checks).

**Not verified:** a real camera, Android or iOS native builds, and runtime permission dialogs on a phone.

### 22. Background music (2026-10-04)

**Prompt:** "Royalty-free chill music (similar to BTD5 music), but with a non-obtrusive audio button (probably top-right)." The team chose music in the app (not the deck), and an original composition made in code with Web Audio rather than a downloaded file.

**Output:**
- `packages/platform/src/music`: the song as plain data (`song.ts`: "Canopy Breeze", F major, 100 BPM, swung eighths, 24 bars in A, B and A2 sections), a look-ahead scheduler on the audio clock (`scheduler.ts`), the synthesised band (`voices.ts`: steel drum lead, marimba chords, kalimba arpeggios, round bass, shaker and hand drums, a generated reverb, master gain 0.18 into a compressor) and the browser player (`webMusic.ts`: AudioContext made on the first press, 1.5 s fade in, 0.4 s fade out, suspended while the page is hidden).
- An optional `music` capability in `packages/platform/src/types.ts`; the web provides it, Android and iOS leave it undefined.
- `packages/ui`: speaker and muted-speaker 12x12 icons, an `IconButton` key and a corner slot on `Screen` that keeps room for it. `packages/app`: `music.tsx` (off by default, choice saved under `climbing-monkey/music/v1`, a saved "on" waits for the first tap or key press).

**Originality:** the melody, chords, rhythms and sounds were written for this app by the AI agent in code. Only the mood was taken from the request (laid-back island music, like tower defence menu music). No melody, chord sequence or rhythm from any existing game or song was copied or approximated, and no samples or audio files are used.

**Validation:** Jest tests for the song data (every bar fills the meter, notes in range, loop length, sections), the scheduler with a fake clock (look-ahead, stop, seamless wrap), the player with a fake AudioContext (lazy context, fades, suspend on hide) and the App (button only with the capability, play and mute, label, saved choice, waiting for a gesture). An OfflineAudioContext render of the same engine in headless Chromium (64 s, one loop plus the wrap) peaked at -7.6 dBFS with an RMS of -25.1 dBFS, no NaN samples, no gap at the loop seam and no silence of 0.3 s or more. Playwright checked the button at 360, 390, 1280 and 1440 px in light and dark, and that no AudioContext exists before a press or, after a reload with music left on, before the first click. `npm run check`, the web build and the Android bundle pass.

**Not verified:** listening on real phone and laptop speakers, and Safari.

### 23. Livelier music (2026-10-04)

**Prompt:** after listening to entry 22: "Make the music more lively and exciting - climbing energy vibe."

**Output:**
- `packages/platform/src/music/song.ts` rewritten as "Top Out": G major, 124 BPM, sixteenths with a light swing, 28 bars that build like a climb. A 4-bar drum and bass groove with a run up into an 8-bar steel drum hook (call and response, phrases stepping upward), an 8-bar half-time lift with rising arpeggios, a rising run and a clap roll, and an 8-bar summit with brighter chords (maj7, add9), a kalimba countermelody and a higher hook that runs back into the groove.
- `voices.ts`: a round kick (pitch drop, no distortion), a clap from band-passed noise bursts, congas and toms, a brighter bass with octave jumps that lock with the kick, a louder lead and a busier shaker. Master gain, compressor and fades are unchanged.
- The corner key moved 8 px in from the top and right so the keyboard focus ring shows on every side. The setup progress plank is taller while the key is there, and the profile tree moved further from the right edge so the monkey stays clear of the key at 360 and 390 px.

**Originality:** as in entry 22, the melody, chords, rhythms and sounds were written for this app in code; only the requested energy was taken as direction. Nothing from an existing tune was copied or approximated.

**Validation:** the song tests were rewritten (tempo, form, meter of every bar, the intro and lift runs, the countermelody, kick and clap placement, a fill at the end of every section, ranges and loop length). An OfflineAudioContext render (66 s, one loop plus the wrap) peaked at -5.0 dBFS with an RMS of -21.7 dBFS, no NaN samples, no gap at the seam and no silence of 0.3 s or more. Playwright screenshots at 360, 390, 1280 and 1440 px in light and dark; `npm run check`, the web build and the Android bundle pass.

**Not verified:** listening on real speakers.

### 24. Groovier music without the piercing highs (2026-10-04)

**Prompt:** after listening to entry 23: "Make the audio more groovy - the random high notes sound grating."

**Output:**
- `song.ts` rewritten as "Jungle Pocket": G major, 122 BPM, swung sixteenths (0.58), 28 bars of groove, hook, half-time lift and summit. The lead is one short riff with repeated notes that keeps coming back, between G4 and B5; nothing in any melodic voice goes above D6. The summit is bigger by fullness (warm keys chords on seventh chords, more kick pushes and congas, a low kalimba answer), not by pitch.
- The rhythm section carries the energy: a pocket bassline with ghost notes and octave pops that lands with the kick, a syncopated kick (1, 3 and pushes around them) with claps on 2 and 4 and a ghost clap, off-beat marimba chops with ghost chops, and small fixed velocity nudges per step and instrument (no randomness, the same on every render).
- `voices.ts`: softer steel drum (lower upper partials, slower attack), a soft low kalimba, a new warm keys voice, and gentle low-passes on the lead, marimba, kalimba, keys, clap and shaker buses.

**Originality:** as in entries 22 and 23, everything was written for this app in code; nothing was copied or approximated.

**Validation:** new song tests for the D6 ceiling on every melodic voice, the repeated hook riff, a summit bigger by fullness, the syncopated kick, ghost notes and octave pops in the bass, off-beat chops and deterministic humanising. An OfflineAudioContext render (66 s, one loop plus the wrap) peaked at -6.7 dBFS with an RMS of -21.8 dBFS, no NaN samples and no gap at the seam; energy above 2.5 kHz is about 4 dB lower than in entry 23 at the same loudness. `npm run check` and the web build pass.

**Not verified:** listening on real speakers.

### 25. Sound effects (2026-10-04)

**Prompt:** "Add typing sounds when text is typing out in the tutorial. Add quiet SFX for buttons and stuff - just use an open-source library if possible. Credit it appropriately."

**Library:** ZzFX by Frank Force (MIT), a tiny sound generator that builds each effect from about 20 numbers, with no audio files. The npm package `zzfx` 1.4.0 was checked (licence file, source) but not installed: it creates an AudioContext when imported, which browsers block before a tap and which does not exist in Jest or on Android and iOS. Its sample generator (`ZZFX.buildSamples`) was vendored into `packages/platform/src/sfx/zzfx.ts` with the original copyright and MIT licence header and a note on the source, version and changes (TypeScript, sample rate as an argument, no playback code). A scratch comparison against the original file gave bit-identical samples for 14 parameter sets. Credited in the file, the README (Third-party code), the table above and on the About page.

**Output:**
- `packages/platform/src/sfx/effects.ts`: five effects as data, all in the music's key with low-pass filters and no randomness. `typing` (46 ms, a low triangle blip whose pitch steps through a G pentatonic by letter), `tap` (39 ms, a soft falling click), `select` (59 ms, a tick that steps up a fourth), `success` (418 ms, D5 then G5) and `levelUp` (423 ms, a G major arpeggio).
- `webSfx.ts` and an optional `sfx` capability (`play(name, variant)`, `enabled`, `setEnabled`) in `types.ts`. The web plays the effects through one gain of 0.1 on the AudioContext it now shares with the music (made lazily, default latency). Nothing is made or resumed before the first tap or key press; effects asked for earlier, or while the page is hidden, are dropped. The context rests 2 s after the last effect when the music is off. Android and iOS leave `sfx` undefined.
- `packages/ui`: a `UiSoundContext`, so `Button`, `IconButton`, `Toggle`, `CheckRow`, the tab bar, rail and breadcrumbs click once per press, and `Chip` ticks when chosen. `SpeechBubble` murmurs once per typing step (about every second letter, none on spaces or punctuation) and stops when the line is out, skipped, changed or unmounted. A new `Toggle` switch.
- `packages/app`: `sfx.tsx` (on by default, choice saved under `climbing-monkey/sfx/v1`) and a Sound panel on About with the switch and the credit line. About is the app's only settings page; the corner key stays music-only. `GameProvider` plays `success` for a saved climb, test result or setup, and `success` or `levelUp` for a done quest.

**Validation:** Jest tests for the effect table (lengths, volumes, filters, no clipping, determinism, pitch steps), the capability with a fake AudioContext (no context before a gesture, nothing when off, setting kept, silent when hidden, buffers reused, sound scheduled before the context wakes, resting only without music), the kit (one tap per Button press, select for a chosen chip, the switch's role and state, the typing murmur's rhythm, silence on spaces and after a skip) and the App (switch on by default, off and remembered across a restart, taps from tabs, a chime after Done, nothing breaks without the capability). Playwright in headless Chromium (20 checks): no AudioContext and no sound before the first click while the welcome line types, one context after it, real typing and tap buffers started, select for a chip, typing stops on a skip, the switch turns off, is saved and stays off after a reload, no console errors. An OfflineAudioContext render through the real capability peaked at -28.7 dBFS (typing), -25.8 (tap), -26.9 (select), -23.5 (success) and -23.7 dBFS (level up), about 17 dB under the music's peak. The first render showed that a DynamicsCompressorNode adds about +11 dB of make-up gain, so the effects use no compressor. `npm run check`, the web build and the Android bundle pass.

**Not verified:** listening on real speakers, Safari and Firefox, and phones (no sound there yet). Whether the effects are loud enough to hear over the music.

### 26. A prop for each onboarding step (2026-10-04)

**Prompt:** "Add slight changes to monkey appearance for each question in the tutorial. For example, it holds a tape measure when asking for measurements. Or it holds a clock when asking for 'how long'."

**Output:** The guide monkey holds or wears something different on every setup step: a wave, map, alarm clock, V-grade tag, trophy, tape measure, phone (apps and consent), clipboard, stopwatch, tally counter, ruler, hourglass, eyes shut with one foot up, a sweatband and a party hat. The props are pixel patches in `packages/ui/src/pixel/sprites.ts` (`MONKEY_PROPS`), drawn over the monkey with the same `overlay` as the cosmetics; held props swap in a bent arm and draw the fist on top, so they stay in the hand while it blinks and hops. `propFor` in `packages/app/src/onboarding/flow.ts` maps each step to its prop. No new libraries, models or APIs.

**Validation:** Jest checks that every prop stays in its slot, uses palette colours, never touches the arm that holds the vine, keeps the 32x28 frame, and stays put in every pose; that every step has its own prop; and that stepping through the flow shows the expected prop. Every step was screenshotted in Chromium at 390 px in light and dark mode and at 1280 px.

### 27. Configurable presentation demo (2026-10-04)

**Prompt:** Add demo mode with individually selectable mocks for unavailable integrations and features, including a choice between simulated and real webcam input. Put the controls beside About; commit and push after verification.

**Output:** Shared demo controls on Tests and About, plus setup and backend-failure access; persistent switches for the sample profile, five health-provider feeds, webcam, photo/clip/live analysis, hand-photo storage, home-test examples and unfinished-test previews. Separate demo storage, anonymous API identities and scenario generations preserve the normal profile and keep late saves out of a reset scenario. Mock media keeps its existing consent/review/save flow and uses explicit simulation labels. Saved entries/results appear on Hands/Tests. `docs/demo-mode.md` documents usage and limits.

**AI/process:** Codex implemented the feature using Canon TDD and reviewed it with a code-review subagent. Review identified reset isolation and simulated-input/real-live combinations; regression tests cover the fixes. No new external libraries, models, provider accounts or image-generation tools were used. The sample camera is drawn with React Native Views; provider feeds and measurements are invented, labelled examples.

**Validation:** `npm run check` passed typechecking, lint and 677 Jest tests in 42 suites (14 added demo tests). `npm run web:build` passed. The in-app browser verified selectable controls, simulated preview, reviewed photo analysis/save, live results, clip recording/review/analysis and persistence after refresh. A separate test verifies real-camera selection with simulated analysis at the capability boundary. Existing lint/deprecation and bundle-size warnings remain.

**Limits:** Physical camera permissions, native device builds and real health integrations were not tested or added. Future-test previews are not measurements. Reset starts a new scenario; deletion of previously retained real demo-server captures uses the existing profile-deletion flow before reset.

### 28. Data hub and live shoulder/force assessments (2026-10-04)

**Prompt:** Group Tests into Data, stream camera assessments with live person markings and manual/automatic stop, move consent to setup and revocable Settings, add shoulder reach and finger strength, and use breadcrumbs for every submenu. The user requested TDD and allowed independent subagents; commit/push authorization continued.

**Output:** Data groups body/reach, mobility/movement, strength/endurance and activity/recovery. Record uses saved optional permission and starts sampled frame streaming rather than a video-file upload. Live skeleton/angles, capture-quality feedback, steady-hold completion and reviewed save support leg spread and bilateral overhead shoulder estimates. Finger strength records external instrument force with N/kgf, side and setup conditions. Assessment history persists locally/API-side, appears on Data/Profile and compares matching conditions/provenance. Settings, setup, demo controls, assessment/force review and direct-linked details have breadcrumb returns; navigation context survives source/demo changes. Invalid measurements keep usable detected markings and correction text but cannot complete/save. Existing photo/video API clients remain supported.

**AI/process:** GPT-6.1 Sol workers independently implemented backend geometry/schema, history/force input, live UI/overlays and test integration. GPT-6 Astra reviewed the complete feature; workers fixed navigation and inactive-state lifecycle findings, and a real-model probe led to better rejected-pose feedback. Canon TDD observed missing behavior before implementation; existing valid behavior was retained as passing characterization coverage. Review regressions include disk-write rollback, partial shoulder-save retries, API/UI instrument length, pending-save breadcrumb races, setup/context preservation and invalid/stale geometry.

**Libraries/models:** Existing React Native/react-native-web, FastAPI/Pydantic, Pillow, MediaPipe Tasks and WebSocket dependencies. No new code dependency or image-generation tool. The official MediaPipe full float16 v1 model was downloaded from Google model storage into gitignored `backend/data/models/pose_landmarker_full.task`; model binaries remain outside Git. Camera/overlay graphics use Views and existing pose landmarks. A previously downloaded public sample image supplied non-personal verification frames.

**Validation:** `npm run check` passed typecheck, lint and 756 Jest tests in 54 suites; `npm run backend:check` passed 237 pytest cases and Ruff. Production web build passed. Browser verification covered Data grouping, stored consent, source-switch breadcrumb return, live simulated shoulder movement/automatic stop, reviewed side-pair save, instrument-force review/save and Data history display. Real MediaPipe/WebSocket checks passed against a temporary database and the running local server: valid leg readings returned 33 points; a bent-elbow shoulder pose returned an invalid measurement with 33 points and a correction. Streaming saved no assessment automatically. Temporary real-server verification profiles were deleted.

**Limits:** Physical webcam/device permission dialogs and native builds were not verified. Camera angles and hold thresholds remain unvalidated engineering estimates; instrument readings are self-reported. Health-provider mocks remain explicit examples, and no grade/clinical/strength-from-photo inference was introduced. Existing native temporary-file/storage limitations and lint/deprecation/bundle-size warnings remain.

### 29. Merging the demo mode and Data hub branch (2026-10-04)

**Prompt:** Merge the team's new backend work (`origin/codex/climbing-monkey-backend`, entries 27 and 28) into the app branch, keeping the music, sound effects, tap-to-edit and onboarding props, and preferring the branch's backend.

**What the agent did (Claude Code):** a single merge commit. The backend came in unchanged. In `App.tsx` the music and sound providers wrap the demo-aware `GameProvider` (which remounts on demo changes) and the demo controls, so the music keeps playing and the corner key also shows in the demo controls. `StepFrame` keeps the prop and the room for the music key and gains the setup breadcrumbs and demo button. `saveAssessment` chimes once the reviewed result is saved. The Sound effects switch moved from About to the new Settings page; About keeps the ZzFX credit. App copy from the branch lost its em dashes and a hand emoji (now the pixel hand icon).

**Validation:** `npm run check`, `npm run backend:check`, the web build and the Android bundle; a Playwright smoke run of setup, music, sound effects, demo mode, the Data hub, Settings and finger strength. No new libraries, models or APIs.

### 30. Gazelle mode (2026-10-04)

**Prompt:** "Create gazelle mode, with the same stylisation and concepts as monkey mode. Use the context of the other convo if needed." Then: "Put this in another branch!" (branch `claude/gazelle-mode`).

**Context:** A subagent read the earlier pets session's transcript. The user had asked for "different pets/modes for targeting different sports" and for a running gazelle, but never said what the mode should contain, so it mirrors the monkey loop.

**Output:**
- `packages/core`: `running.ts` (run log, easy/tempo/long tallies, the same focus rule as climbing, pace, weekly km, leg flags), `runQuests.ts` (draft gazelle quests, paused while a leg is flagged), `runGame.ts` (state, reducer, labelled sample runs). `petStatus` takes the unlock list, so the gazelle gets its own (race bib, gold medal).
- `packages/data`: `runs.ts`, an on-device `RunBackend` for runs and the saved pet mode. The FastAPI backend was not changed.
- `packages/ui`: a savanna palette behind `WorldContext`, a generated savanna scene and `SavannaHero` (the gazelle runs to a marker post per quest), gazelle cosmetics and leap animation, run type, surface and shoe icons, and `RateTriangle` (the terrain triangle made generic).
- `packages/app`: `RunProvider` (`useRun()`), gazelle Profile, Log, Legs and Evidence screens, mode-aware tabs, rail, level-up banner and sync notice, and a pet switch on both profiles. Climbing setup only runs in monkey mode.

**Tools:** Claude Code (Anthropic) wrote the code, tests and pixel art. Playwright with the preinstalled Chromium took screenshots of the web build for visual checks. No new libraries.

**Validation:** `npm run check` passes (typecheck, lint with no errors, 725 Jest tests, including new core, data, scene and App-level gazelle tests). The production web build and the Android release bundle build. Checked visually at 390 px (day and night) and 1280 px.

**Limits:** Gazelle quest text is draft and needs a coach's review. Leg flags are the runner's own notes, not a diagnosis. There is no running pose analysis, no Strava import and no server support for runs yet.

### 31. Gazelle mode on the merged app (2026-10-04)

**Prompt:** Bring `claude/gazelle-mode` (entry 30) into the app branch after entry 29, as one squashed commit, working alongside demo mode, the Data hub, Settings, the music, the sound effects, the onboarding props and tap-to-edit.

**What the agent did (Claude Code):** `RunProvider` sits inside the demo-aware `GameProvider`, under the music and sound providers, so the music key shows and keeps playing in gazelle mode. Gazelle mode keeps the navigation and setup restore from entry 28 for the monkey only; a kept stack is used only in the mode it came from. The monkey tabs keep Data in place of Tests. Logging a run plays `success` and a gazelle quest plays `success` or `levelUp`, like the monkey. Runs stay on the device and are not part of the demo profile, so the demo caption is hidden in gazelle mode. The finger strength test now wraps its screen in a `RunProvider`, as the app does, because the tab bar reads the pet mode.

**Validation:** `npm run check` (993 Jest tests, including a new sound test for a logged run), `npm run backend:check`, the web build and the Android bundle. Playwright at 390 and 1280 px: switch to gazelle mode, play music, log a run with sounds, see the savanna profile, switch back to the monkey, the Settings switch and the setup props, with demo mode on and after a reload; no console errors. No new libraries, models or APIs.
### 32. Dolphin mode, and one engine for the sport modes (2026-10-04)

**Prompt:** "Cook on a dolphin mode, for swimming." Built on branch `claude/dolphin-mode`, which starts from `claude/gazelle-mode`.

**Output:**
- Gazelle mode was turned into a generic sport mode so the dolphin did not mean a third copy of the code. `packages/core/src/sport.ts` holds the shared rules (tallies, the focus rule, quest picking, reducer, weekly distance). `sports/running.ts` and `sports/swimming.ts` define each sport: three kinds, places, sore spots, unit, quests, unlocks, sample data and pace.
- Swimming: freestyle, breaststroke and backstroke in a pool, lake or sea, distances in metres and pace per 100 m. Draft quests (breathe every three, glide for two, still head, stroke counts) and a body check-in. Shoulder to ankle flags pause swimming quests.
- `packages/data/src/sports.ts`: one on-device backend for both sports. `packages/app`: `SportProvider` (`useSport()`), generic Profile, Log, sore-spot and Evidence screens with per-sport words and icons in `sports.ts`, and a shared Pets panel with all three pets.
- `packages/ui`: a dolphin sprite (drawn from shapes in a small script, then pasted in as text like the other sprites) with a swim cap and goggles as unlocks, an ocean palette and scene (buoys per step, a palm island finish, coral and seaweed), stroke, water and goggle icons, `FramePet` shared by the gazelle and dolphin, and `SportHero` for both worlds. The wooden panels' top bevel became a theme colour so the ocean can repaint it.

**Tools:** Claude Code (Anthropic) wrote the code, tests and pixel art. Playwright with the preinstalled Chromium rendered sprite previews and screenshots of the web build. No new libraries.

**Validation:** `npm run check` passes (typecheck, lint with no errors, Jest including the shared engine, both sports' rules, the backend, both scenes and App-level tests for switching, levelling, logging and flags in both modes). Web build and Android release bundle build. Checked visually at 390 px (day and night) and 1280 px.

**Limits:** Swimming quest text is draft and needs a coach's review. Flags are the swimmer's own notes, not a diagnosis. No pose analysis for swimming, no watch import and no server support for either sport yet.

### 33. Dolphin mode on the merged app (2026-10-04)

**Prompt:** "Merge the new dolphin mode into this branch."

**What the agent did (Claude Code):** applied the dolphin commit (entry 32) on top of entry 31 as one squashed commit. `RunProvider` gave way to `SportProvider`, which now plays the same sounds as entry 31 (`success` for a logged session, `success` or `levelUp` for a quest). The kept navigation stack now remembers its pet mode, because the gazelle and the dolphin share routes, so switching between them still starts on the new pet's profile. The monkey tabs keep Data, the demo caption stays hidden in both sport modes, and the finger strength test wraps its screen in a `SportProvider`.

**Validation:** `npm run check` (1043 Jest tests), `npm run backend:check`, the web build and the Android bundle. Playwright at 1280 px: skip setup, switch to the dolphin, log a 1500 m swim, switch to the gazelle and back to the monkey, then reload; all three worlds draw with the music key and there are no console errors. No new libraries, models or APIs.

### 34. Documentation cleanup after the merges (2026-10-04)

**Prompt:** Clean up the docs after the demo mode, Data hub, music, sound effects, onboarding, gazelle and dolphin merges: fix stale facts, remove duplication, credit third-party code correctly, and leave `context/` and earlier log entries alone.

**What the agent did (Claude Code):** checked the README, `CLAUDE.md`, the package READMEs, `backend/README.md` and `docs/*.md` against the code and fixed what had drifted. The README now opens with a short list of what works, has one section for music and sound instead of three, a shorter demo section that points to the demo guide, the backend and docs folders in the layout, `ui → core` in the dependency rule, the in-memory phone storage as a known gap, and credits for MediaPipe, react-native-camera-kit, react-native-permissions, PyAV and vision-demos next to ZzFX. The data README gained `saveAssessment`, the assessment records and the demo backend swap, and says the Data tab where it said Tests. Exact test counts were dropped from the camera guide, and the backend TDD record is marked as a dated snapshot. Doc comments that still named the Tests tab, `SavannaHero` or `mediaWire.ts` were corrected. No behaviour changed.

**Tools:** Claude Code (Anthropic). No new libraries, models or APIs.

**Validation:** `npm run check` (typecheck, lint with no errors, all Jest tests). A script checked that every relative link and anchor in the edited Markdown resolves.

### 35. Merging the decision evidence branch (2026-10-04)

**Prompt:** Merge `origin/main` (the team's decision evidence and citation work) into the app branch. Keep all of main's logic, data contracts, backend, tests and new screens, keep all of this branch's features and its visual style, and wire main's new code into this branch's shapes.

**What main brought:** the source registry and explanation builders (`packages/core/src/evidence.ts`), question-mark explanations (`DecisionHelp`, `ExpandableTray`, `resultExplanations`), decision DTOs in `wire.ts`, backend quest snapshots with deletion redaction, compact Data and Profile summaries with detail pages (`BodyReachScreen`, `MeasurementDetailScreen`, `ActivityScreen`, `DataRow`), `SubpageFooter` and the `TabScreen` `completion` prop, the `HandDiagram` hand input, the assessment camera and review trays, more climbing styles in the log, and the Claude handoff docs. Main added no entries to this log; its handoff note and plan say the work was done with Codex, so it is recorded here.

**What the agent did (Claude Code):** ran the merge and resolved five conflicts. `TabScreen` keeps the sport modes and gains main's `completion` prop and `SubpageFooter`. `SubpageFooter` now treats the gazelle and dolphin tabs as tab roots, so they show no Close button, and falls back to the sport profile from a sport page. The Data tab takes main's compact rows, which moved the reach, home test, camera and activity panels to their detail pages. The shoulder reach labels take main's wording, which main's explanation tests use. The simulated finger strength caption and the demo caption keep this branch's wording. Everything else merged cleanly: `PetsPanel` stays on Profile, `GameProvider` keeps its save sounds, and onboarding keeps its props and tap-to-edit next to main's explanations. Two App-level tests cover the sport-mode footer rule, seen failing before the fix. `docs/camera-video.md` now describes main's Data layout.

**Tools:** Claude Code (Anthropic). Playwright with the preinstalled Chromium for the smoke test. No new libraries, models or APIs.

**Validation:** `npm run check` (typecheck, lint with no errors, 76 Jest suites and 1137 tests), `npm run backend:check` (258 tests), the web build and the Android bundle. Playwright at 390 px and 1280 px on the built web app: skip setup, visit Profile, Log, Hands, Data and Settings, open a question-mark explanation, switch to the dolphin and back; no console errors.

**Limits:** main's handoff asks for a later redesign of how the explanations are presented. This merge keeps them as main built them.

### 36. Credibility and citations: one calm "why?" view (2026-10-04)

**Prompt:** Redesign how Climbing Monkey explains its results and cites research, following the Codex handoff (`docs/claude-handoff.md`): one small "?" beside each generated value that opens one clean explanation; arithmetic and selection rules cite no papers; research only where a published claim is made; a "How was this data created?" section under the terrain triangle; quieter sample and draft markers; the same treatment in gazelle and dolphin mode. Keep the jungle pixel style and the decision data contracts.

**What the agent did (Claude Code):** replaced the accordion-style `DecisionHelp`, `ExpandableTray` and nested trays with four kit components in `packages/ui`: `HelpMark` (a superscript pixel ?), `Sheet` (a pixel sign over the page, Escape and Back close it), `Disclosure` (folded detail) and `SampleMark` (a quiet dithered sample-data note). `DecisionHelp` keeps its props, so other screens changed only at their call sites. Every explanation now reads the same way: one sentence, **Your inputs** (folded when long), **How it works** in plain words, **Research** with one finding and a short citation per study plus one **Study details** control, and **Limits** in one or two lines. `evidence.ts` was rewritten in plain English: no rule IDs, booleans or field names; the focus, tallies, XP, log quests and drills cite no papers; the pause rule cites only the pulley imaging study, the preview quests the two preview studies, the camera the two pose studies, and reach the anthropometry study. Each source gained a one-line `finding`. Sport focus and quest explanations were added (`explainSportFocus`, `explainSportQuest`). The Evidence page's style grid boxes open their own explanation instead of nine extra rows. The Example tags on the sport profile and evidence pages became `SampleMark` captions, and the Profile walls gained one. About's research section uses the same citation list and its credits name the camera and pose libraries.

**Tools:** Claude Code (Anthropic). Playwright with the preinstalled Chromium for screenshots. No new libraries, models or APIs.

**Validation:** `npm run check` (typecheck, lint with no new warnings, 76 Jest suites and 1147 tests; new tests check plain-language rules, research only on published claims, folded inputs, unknown provenance and the sport sheets), the web build and the Android bundle. Playwright screenshots at 390 px and 1280 px, day and night, in the jungle, savanna and ocean: Profile with a ? open, the Evidence page, a home test result and the Hands pause rule. Escape closes the sheet and returns focus to the ?.

**Limits:** the backend still writes its own explanation text and source IDs (for example `orth2018` on reflection quests); the app shows server explanations as written. The research findings are paraphrased from the dossier's reading depth and were not re-read against the papers.

### 37. Input flows and assessment screens: record, understand, next action (2026-10-04)

**Prompt:** Redesign the UX of the input flows and assessment screens from the handoff (`docs/claude-handoff.md` and the assessment presentation note): a new user should know what to enter, why, whether it is optional and what happens after saving; each Data item should show one quiet readiness state so nothing that cannot run looks usable; strip implementation detail from primary screens; start personal records folded; redesign the leg spread and shoulder reach screens without changing their behaviour, geometry or thresholds. Keep the jungle pixel style.

**What the agent did (Claude Code):** the Data tab now groups inputs by kind (climbs and hands, home tests, body and reach, camera, activity, then an App panel), each with one line of purpose. `readiness.ts` derives one state per input (Ready, Demo, Needs permission, Needs a camera, Needs the server, Coming later) from the media client, camera, saved permissions and demo switches; `StateLabel` shows it and rows that cannot be used and have nothing saved do not open. `DataRow` became a whole-row link with a chevron. `SavedNote` ends every save with what changed and at most two next steps: the climb log (wall tally and whether the focus moved), Body & reach (ape index, next home test), home tests (the page stays and offers the next test), finger strength, the finger close-up (link to the quest) and both camera assessments (link to the results); the messages are pure functions in `afterSave.ts`. The gazelle and dolphin logs use the same note and folded today list, and a flagged spot links to the quest. Backend setup instructions, protocol strings and rule wording left the primary screens; today's climbs and demo journal entries start folded; Profile gathers its record rows into one Your records panel and marks the movement radar Coming later. The assessment screen puts the status and Record or Stop inside the Camera tray under the fixed 280 px box, gives every off, blocked and unavailable state a pixel camera placeholder, shows the live value on the preview, keeps the captured reading in the box during review, uses one Result tray (save, retry, detail links), and continues the page breadcrumb into the review so there is one trail. Kit additions are backwards compatible: a camera and a ruler icon and a degree glyph. Merged the credibility work (entry 36) and kept its help sheets at the call sites.

**Tools:** Claude Code (Anthropic). Playwright with the preinstalled Chromium for screenshots. No new libraries, models or APIs.

**Validation:** `npm run check` (typecheck, lint with no new warnings, 1168 Jest tests; new tests cover readiness states, after-save messages, the input journey and the reworked assessment trays, and the existing consent, cleanup, pending-save, simulated-provenance and completion tests still pass), the web build and the Android bundle. Playwright screenshots at 390 px and 1280 px, day and night: skip setup, log a climb, flag a finger, the Data hub and its detail pages, a home test, both assessments in demo mode (idle, starting, live, review, both detail views, saved), the missing-service and withheld-permission states, Settings, and the gazelle log.

**Limits:** the demo pose never returns an invalid frame, so the live correction state was checked in tests, not on screen. Health imports and the movement radar are still not built; they are labelled Coming later rather than hidden.

### 38. Export for the people in your life (2026-10-04)

**Prompt:** add an Export section to every mode (climbing, running, swimming) with formats for a doctor, a physio, a coach, a nutritionist, family, yourself and a data file, each aimed at one reader, backed by science and reusing the evidence work. Targets the track goals on preparing for appointments and sharing relevant details with caregivers.

**What the agent did (Claude Code):** pure TS export in `packages/core/src/export/`: one snapshot builder per mode (`buildClimbingSnapshot`, `buildSportSnapshot`) that copies only the fields an export may show, one audience definition per reader (sections with defaults, question prompts, a "what this is not" line, source ids), a format neutral document turned into plain text, Markdown or a standalone printable HTML page, CSV (formula guarded) and JSON with a schema version, provenance labels on every number (entered, timed, my tool, camera, app, example), example banners, and `explainAudience` with a who reads it, what goes in, what stays out flow for the existing Why? sheet. A `ShareCapability` in `packages/platform` (React Native `Share` on phones; Web Share, clipboard, a Blob download and an iframe print view on the web, with a host save hook tried first because some embedding hosts block link downloads). `ExportScreen` lists the readers with a "?" each; `ExportFormatScreen` sets the period, sections, questions and file type and shows the exact text before it is shared. Entry points: a Share your record panel on the monkey, gazelle and dolphin profiles and a Share row on the Data hub. Typed text stays in screen state and is never saved. New pixel icons for each reader and a `plain` option on `CheckRow` for sentences.

**Research:** 20 sources added to `RESEARCH_SOURCES`, checked on 2026-10-04 from bibliographic records and abstracts and marked as read at abstract level: sansoni2015, kinnersley2008, muller2018, talevski2020, berkman2011, wolff2011, elwyn2012, delbanco2012, harkin2016, coleman2012, bull2020, foster2001, impellizzeri2019, bourdon2017, soligard2016, impellizzeri2020, bahr2020, clarsen2013, thomas2016, mountjoy2023. Each supports only why a format is laid out as it is (questions before a visit, a handover order, weekly minutes, load as counts with no ratio, side, place and onset for a sore spot, no energy estimates). None tested this app. Where no DOI was confirmed the link goes to a public record and the limits say so. Finger, grip and camera studies are cited only in climbing. Rejected: Brandes 2015 (misattributed in the brief), reading grade targets, acute to chronic workload ratio as an injury predictor, FHIR interoperability claims.

**Tools:** Claude Code (Anthropic). Playwright with the preinstalled Chromium for screenshots. React Native's built-in Share API. No new libraries, models or APIs.

**Validation:** `npm run check` (typecheck, lint with 0 errors and the same 71 warnings, 1402 Jest tests; new tests cover snapshots per mode, every reader in every mode and renderer, no dashes, emoji or diagnosis and validation words in generated text, the example banner, legends, questions and typed text, CSV quoting and formula guards, JSON provenance, the period in data files, the flows, the share capability including the host save hook, and the screens: entry from every profile and the Data hub, the preview, a section turned off, share, copy and its fallback line, buttons per capability, and typed text kept out of storage), the web build and the Android bundle. Playwright screenshots at 390 px and 1280 px, day and night, in all three modes, every preview and the Why this format sheet. One sample file per reader and format was grepped for dashes, overclaims and leaked fields.

**Limits:** effort ratings and climbing session time are not recorded, so the sheets say so instead of guessing. On phones files are shared as message text, not attachments. The sources were read at abstract level. Nothing is uploaded; the person chooses where the text goes.

### 39. Decisions drawn as a vine: one-column evidence, flow graph and clearer inputs (2026-10-04)

**Prompt:** User feedback: make the decision pages one column in wide mode; present the "How it works" rules as a monkey-themed graph that shows where the inputs feed in, because the text lines were hard to parse; make the inputs clearer.

**What the agent did (Claude Code):** the Evidence pages (climbing and sport) now use one centred 640 px column at every width (`SingleColumn` in `packages/ui/src/layout.tsx`, `TabScreen single`), in the order wall picker, summary and focus, wall x style grid, climbs, with sample climbs marked once. Core gained `packages/core/src/flow.ts`: a `DecisionFlow` shape (inputs, steps, yes/no checks with the branch taken, a result), `isDecisionFlow` and `flowText`. `explainFocus`, `explainQuest`, `explainPause`, the tallies and grid cells, `explainCamera`, `explainSportFocus`, `explainSportQuest`, and the app's XP and reach explanations now return an optional `flow` and `inputSummary`, and their records an optional `view` (short date, badge, icon, title, note, outcome). The text `rule` is unchanged. The new `DecisionFlow` component draws the flow with Views: input chips and a funnel, a vine with leaves, green step holds, wooden question signs, a banana YES/NO branch with a check mark and a dashed "not taken" branch, side records joining where they are used, TEAM RULE stamps, and the monkey, gazelle or dolphin holding the result. It is one accessible image read from `flowText`, with the text rule under **Rule in words**. "Your inputs" leads with a summary line, draws records as rows like the Evidence page's climbs list without internal IDs (still spoken in full), shows three then **Show all N**, and puts flags and quest progress before climbs in quest sheets. `DecisionHelp` props are unchanged; explanations without a flow show the text rule as before.

**Tools:** Claude Code (Anthropic). Playwright with the preinstalled Chromium for screenshots. No new libraries, models or APIs.

**Validation:** `npm run check` (typecheck, lint with 0 errors and the same 71 warnings, 1188 Jest tests; new core tests cover the branch taken for walls under 3 logs, all walls at 3+, both tie cases, the finger pause and check-in, tallies, camera and sport flows, input summaries and record rows; new renderer tests cover the accessible flow label, the "not taken" words, the text fallback, the input summary, the single sample note and Show all), the web build and the Android bundle. Playwright screenshots at 390 px and 1280 px, day and night: the profile focus and quest sheets with a flagged finger, the Evidence tally sheet, the full Evidence page and the gazelle focus and quest sheets.

**Limits:** server explanations carry no flow or record views, so they keep the text list. Home tests and the example radar have no rule to draw and stay as text. The flow restates the existing rules; it adds no research claims.

### 41. Log tab opens on your climbs, the form moves to a subpage (2026-10-04)

**Prompt:** User feedback: "when you open it, it should just show the logged climbs, we should then be able to filter for today/week etc. there should be a Log Climb button in top right of the tray to take you to a subpage which takes you to the current log a climb page". Apply the same shape to the running and swimming modes.

**What the agent did (Claude Code):** the Log tab now shows one "Your climbs" tray: a count line ("5 climbs this week: 3 sent."), sample climbs marked once, and the climbs newest first under day headings. Filter keys above it pick Today, Week, Month or All; it opens on this week, or on all when the week is empty, and each filter has an empty state with a Log a climb button. The date rules are pure TS in `packages/core/src/logRange.ts` (`filterLogs`, `defaultRange`, `groupByDay`, `dayHeading`; weeks run Monday to Sunday) with unit tests for today, week ends, months and empty results. A "Log climb" button sits in the tray's top right (a new `action` slot on `Panel`) and opens the new `LogClimb` route, Log > Log a climb, which holds the unchanged form with breadcrumbs and a Close footer. After a save the note stays on the subpage with the same wording and offers See your climbs, which returns to the list with the new climb framed, and See profile. Rows are one shared `RecordRow` component, now used by the Log lists, both Evidence pages and the Why? inputs; core exports `climbRecord` and `sessionRecord` (with pace) for them. The gazelle and dolphin Log tabs use the same `LogList` with words from `SPORT_VIEWS`, and Log run or Log swim opens `SportLogSession`. The Evidence and sport profile "Log a" buttons open the subpage with the Log tab active (a new `openTrail` on the navigator); rows that open the climbing log (Profile, Data, Activity) land on the list.

**Tools:** Claude Code (Anthropic). Playwright with the preinstalled Chromium for screenshots. No new libraries, models or APIs.

**Validation:** `npm run check` (typecheck, lint with 0 errors and the same 71 warnings, 1199 Jest tests; new tests cover the date ranges, the trail and `openTrail`, the empty state, the framed climb after a save and the sport subpages), the web build and the Android bundle. Playwright screenshots at 390 px and 1280 px, day and night: the Log tab on this week, Today empty, Log a climb, after saving, the list with the new climb, the gazelle Log tab and Log a run.

**Limits:** only climbs and sessions logged today can be removed, as before. There are no wall or run-type filters on the list; the Evidence pages already split by wall and kind.
