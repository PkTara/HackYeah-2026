# AI Workflow

Use this file for significant AI/external-resource disclosure in the Sport & Healthcare submission. Keep it updated as the project evolves: record each significant AI-assisted step, what was generated, and how it was checked. Remove API keys, credentials and personal data before publishing.

## Tools used

| Tool | Model | Used for |
|---|---|---|
| Claude Code (VS Code extension) | Claude Opus 5.5 (`claude-opus-5-5`) | Converting the challenge PDFs to Markdown, researching the React Native setup, scaffolding the project, writing code and docs |
| Codex desktop | GPT-6 | Drafting the climbing app product design and checking MediaPipe capability documentation |
| Codex (with subagents) | GPT-6.1 Sol, reviewed by GPT-6 Astra | The FastAPI backend, its video and live camera APIs, the first camera adapters and capture screens, and the scientific evidence notes (log entries 11 and 20) |
| Claude Code (claude.ai cloud session, with parallel subagents) | Claude | Pixel-art pets, the jungle pixel UI kit, the climbing profile rules, the app screens, the web layout, onboarding, connecting the app to the backend, and the camera screens |

The Codex design-drafting step used the `superpowers:using-superpowers` and `superpowers:brainstorming` skills, plus web browsing of official MediaPipe documentation.

## AI features in the app

**Camera assessment (server-side pose).** The Tests tab's camera assessment sends a photo, a recorded clip (web) or sampled live frames to the FastAPI backend, which runs MediaPipe Pose Landmarker (a Google model, Apache-2.0, configured with `POSE_MODEL_PATH` and not in Git) and returns the angle between the legs in the picture.
- Inference flow: remote, on the team's own server. Nothing goes to a third-party service.
- Data sent and stored: media leaves the device only after the climber ticks "Send for analysis" for that photo or clip; the screen names the server first. The server analyses it in memory and keeps nothing. A result is stored only when the climber reviews it and presses Save, as their own report.
- Limitations and failures: a projected 2D angle, not a validated flexibility test; camera height, angle and clothing change it, and the screen says so. A capture without visible hips and ankles returns a reason and no number. Without a model the server answers 503 and the screen says so. Without a server the screens say they need one and never show a result.
- Validation: unit tests with a fake server, backend tests with real decoding, and browser runs against the real model with a public sample photo (log entry 21). Not yet compared with a measured angle.

**Hand photos** are not analysed by any model: they are kept privately on the server with the climber's own entry, after a separate upload and retention consent.

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

### 22. A prop for each onboarding step (2026-10-04)

**Prompt:** "Add slight changes to monkey appearance for each question in the tutorial. For example, it holds a tape measure when asking for measurements. Or it holds a clock when asking for 'how long'."

**Output:** The guide monkey holds or wears something different on every setup step: a wave, map, alarm clock, V-grade tag, trophy, tape measure, phone (apps and consent), clipboard, stopwatch, tally counter, ruler, hourglass, eyes shut with one foot up, a sweatband and a party hat. The props are pixel patches in `packages/ui/src/pixel/sprites.ts` (`MONKEY_PROPS`), drawn over the monkey with the same `overlay` as the cosmetics; held props swap in a bent arm and draw the fist on top, so they stay in the hand while it blinks and hops. `propFor` in `packages/app/src/onboarding/flow.ts` maps each step to its prop. No new libraries, models or APIs.

**Validation:** Jest checks that every prop stays in its slot, uses palette colours, never touches the arm that holds the vine, keeps the 32x28 frame, and stays put in every pose; that every step has its own prop; and that stepping through the flow shows the expected prop. Every step was screenshotted in Chromium at 390 px in light and dark mode and at 1280 px.
