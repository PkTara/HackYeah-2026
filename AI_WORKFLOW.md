# AI Workflow

The Huawei challenge requires this file. Keep it updated as the project evolves: record each significant AI-assisted step, what was generated, and how it was checked. Remove API keys, credentials and personal data before publishing.

## Tools used

| Tool | Model | Used for |
|---|---|---|
| Claude Code (VS Code extension) | Claude Opus 5.5 (`claude-opus-5-5`) | Converting the challenge PDFs to Markdown, researching RNOH, scaffolding the project, writing code and docs |

No MCP servers or custom Agent Skills were used so far.

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
