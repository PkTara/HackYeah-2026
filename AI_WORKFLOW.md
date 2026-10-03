# AI Workflow

Use this file for significant AI/external-resource disclosure in the Sport & Healthcare submission. Huawei separately mandates this filename if we submit to that track. Keep it updated as the project evolves: record each significant AI-assisted step, what was generated, and how it was checked. Remove API keys, credentials and personal data before publishing.

## Tools used

| Tool | Model | Used for |
|---|---|---|
| Claude Code (VS Code extension) | Claude Opus 5.5 (`claude-opus-5-5`) | Converting the challenge PDFs to Markdown, researching RNOH, scaffolding the project, writing code and docs |
| Codex desktop | GPT-6 | Drafting the climbing app product design and checking MediaPipe capability documentation |

The Codex design-drafting step used the `superpowers:using-superpowers` and `superpowers:brainstorming` skills, plus web browsing of official MediaPipe documentation.

## AI features in the app

None yet. When the app gets an AI feature, document:
- the model or service;
- the inference flow (on-device, remote or hybrid);
- what data is sent and stored;
- limitations and failure handling;
- how outputs are validated;
- privacy considerations.

## Log

### 1. Hackathon context (2026-10-03)

**Prompt:** "Look through the hackathon context files - convert PDFs to LLM-friendly files … Extract useful information."

**Output:** `context/00-OVERVIEW.md` and `context/tracks/*.md`.

**Validation:**
- The PDFs were extracted with `pdftotext` and the text was read in full.
- The agent flagged inconsistencies in the source material: a duplicated SmartCity PDF and conflicting AI Control Layer weights.

### 2. Project scaffold (2026-10-03)

**Prompt:** "Setup react native targeting HarmonyOS from Huawei. Want a mobile app - modularise so that it can be adapted to other formats if possible."

**What the agent did:**
- **Research.**
  - Queried npm for RNOH versions: 0.84.4 is `latest` and is paired with RN 0.84.1.
  - Downloaded the RNOH packages and read the CLI source and the Harmony template, since the online docs on GitCode don't render outside a browser.
- **Scaffold.**
  - Ran `@react-native-community/cli init` (RN 0.84.1).
  - Installed RNOH 0.84.4 and ran `react-native init-harmony --bundle-name com.hackyeah.app`.
  - Raised `compatibleSdkVersion` to API 20.
- **Fixed two toolchain problems:**
  - The RNOH CLI crashed on Node 24 because `Dirent.path` was removed. Patched with patch-package (`apps/mobile/patches/`).
  - The CLI couldn't find `hermesc` in RN 0.84. Fixed by passing `--hermesc-dir node_modules/hermes-compiler/hermesc`.
- **Designed and wrote the modular structure.**
  - Shared packages: `packages/{core,platform,ui,app}`.
  - Thin hosts: `apps/mobile` and `apps/web`.
  - Per-platform capability files: `.harmony.ts` / `.ts` / `.web.ts`.

**How the output was validated (no HarmonyOS SDK on the dev machine at the time):**
- `tsc --noEmit`, ESLint and Jest (8 tests: domain reducer, App rendering, navigation, haptics through injected capabilities) all pass.
- `react-native bundle-harmony` produced a Harmony bundle. Inspecting it confirmed that `capabilities.harmony.ts` and RNOH's `Platform.harmony.ts` were resolved.
- A Hermes bytecode release bundle (`hermes_bundle.hbc`) was compiled successfully.
- The Android bundle resolves the default `capabilities.ts`.
- The web production build was rendered in jsdom: it shows "Running on Web browser" and the counter responds to clicks, with no runtime errors.
- Not yet verified: building the `.hap` in DevEco Studio and running it on an emulator or device.

**Approaches that didn't work:**
- `rnoh-cli init`: its template package `@react-native-oh/template` isn't published on npm. Used `init-harmony` on a community RN project instead.
- Rendering the web build in headless Edge: blocked by the sandbox.
- Vite SSR as a substitute: hit a CommonJS/ESM interop error in a react-native-web dependency.
- Both were replaced by the jsdom check above.

### 3. Climbing app design draft (2026-10-03)

**Prompt:** Start a Markdown design document for a React Native climbing profile app using physical tests, pose tracking, external activity/health data, hand photos and recovery tracking, with possible form coaching and a guided pain walkthrough.

**Output:** `docs/climbing-app-design.md`. The draft organizes the idea into a core profile and hand journal, proposed hackathon scope, platform boundaries, and optional extensions. No app features or inference models were implemented in this step.

**Validation:** Read the existing repository architecture and hackathon context; checked Google's official Pose Landmarker and Hand Landmarker guides; reviewed the draft for scope consistency and distinctions between camera estimates, measured performance, symptom reports and medical conclusions. Native inference feasibility and clinical content remain unvalidated.

### 4. Visual profile design and delegated research (2026-10-03)

**Prompt:** Add a clear radar/triangle profile for terrain and movement styles, research further features with an agent, and have another agent review the supplied context. The user confirmed profile-first direction so people can understand their performance and act on it.

**Output:** Expanded `docs/climbing-app-design.md` and added `docs/assets/climbing-style-profile.svg`, an illustrative concept sketch. Two user-requested agents researched feature candidates using primary sources and reviewed repository hackathon requirements. The draft includes independent terrain axes, a movement radar, controlled/dynamic indicators, an optional combined grid, evidence rules, action flow and Huawei submission fit.

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

**Output:** `context/tracks/open-sport-healthcare.md`, `docs/climbing-monkey-alignment.md`, and updates to the design, shared open-track context, overview, repository guidance and README. Sport & Healthcare is the primary product brief; existing HarmonyOS technology and optional Huawei submission requirements are distinguished.

**Validation:** System `pdftotext` was unavailable, so bundled `pypdf` extracted all four description pages and all three rules pages. The context-review agent independently read both PDFs and checked requirements, judging weights and alignment gaps. Matched general upload constraints separately; retained platform/start-time source discrepancies. Reviewed local links and whitespace. No product implementation or claimed user study was added.

### 8. Problem and solution pitch copy (2026-10-03)

**Prompt:** Using the design doc and the rest of the context, write a brief outline of why we want to build the project, with statistics showing the problem exists, and a brief description of the solution and its benefits for the user or customer.

**Output:** `docs/pitch-problem-solution.md`: description-ready problem and solution paragraphs (~270 words together), slide versions, a benefits table, deliberate non-claims, a pre-submission checklist and a sources table.

**Validation:** Statistics came from web searches. The environment's proxy blocked direct fetches of journal, IFSC and WHO pages, so each figure was cross-checked against search-indexed abstracts and coverage. Figures that could not be attributed cleanly were dropped. The file notes that each link should be opened once before submission, and that no published statistic covers the core "what should I train next?" need. Product statements describe intended features, not the current scaffold.

**Revision:** At the user's request, rewrote both answers as one narrative (problem → monkey quests → data collection → weakness analysis → training plan). Removed the injury, WHO and gamification statistics; only the climber-count and new-gym figures remain.
