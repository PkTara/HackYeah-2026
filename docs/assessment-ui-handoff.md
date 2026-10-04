# Assessment UI handoff for Claude

## Goal and current status

Continue the visual redesign of the **Leg spread** and **Shoulder reach** assessment screens. The user rejected the current presentation as visually poor. The previous implementation improved structure and preserved behavior, but it is **not an accepted final visual design**. Do not treat passing tests as evidence that the screens look good.

The assessment changes are in commit `6024cee9a1110e7529a5dfbe5be3d084ece0a357` on `codex/assessment-presentation`, based on published baseline `bdde1fb067260453a0ebb29947e3cf1417089caf`.

The coordinator separately committed shared completion controls as `e278827` on `codex/compact-ui-integration`. Check the branch you receive before integrating anything: these commits may already be present. Do not duplicate shared changes.

## What was changed

| File | Responsibility |
| --- | --- |
| `packages/app/src/screens/AssessmentScreen.tsx` | Selects the metric, renders the page wrapper, supplies persistent consent and the save callback, and forwards local completion overrides to `TabScreen`. Also shows the permanent Camera tray when no analysis service exists. |
| `packages/app/src/capture/LiveAssessment.tsx` | Owns camera readiness, live sessions, stability, overlay freshness, review data and saving. The presentation now groups controls and live feedback into a Recording tray, with a How to measure tray. |
| `packages/app/src/capture/AssessmentCameraTray.tsx` | New presentation component with a clearly titled Camera tray and permanent 280 px camera box. Idle, starting, unavailable, permission-blocked and review states use that same surface. |
| `packages/app/src/capture/AssessmentReview.tsx` | New presentation component with Measurement, Capture quality and Actions trays. Measurement details and Capture details are local breadcrumb-backed views. It also reports the appropriate local completion action. |
| `packages/app/src/capture/__tests__/LiveAssessment.test.tsx` | Existing lifecycle regressions plus new camera-box, tray, detail-navigation and completion tests. |
| `packages/app/src/__tests__/assessmentPresentation.test.tsx` | New screen tests for missing service, denied camera permission and missing camera capability. |
| `packages/app/src/__tests__/cameraEntry.test.tsx` | Updated only the direct assessment/no-service expectation: a permanent placeholder and disabled Record control replace the old server-only message. |

No backend geometry, transport, stability thresholds, global routes, Data/Profile, Hands or Log implementation was changed by this commit.

## Why the current result still needs visual work

The current layout is mostly stock jungle panels stacked vertically. Merely wrapping content in panels did not produce a cohesive screen.

- The permanent camera box uses substantial space during review. Its inactive state needs to feel intentional and fit the surrounding composition.
- Recording guidance, source information and instructions add visual weight and scrolling.
- Primary actions and secondary detail buttons need a clearer hierarchy.
- Tray spacing, title tabs, badges, button sizes and alignment need a deliberate visual pass at phone and desktop widths.
- The global page breadcrumb and local review/detail breadcrumbs should read coherently together.

Use the existing jungle UI language, including `Panel`, `Button`, `Tag`, typography and theme tokens, but reconsider their composition and prominence. Refine the four implementation files above. The goal is a compact, confident assessment experience with a clear next action, readable measurements and quieter supporting information. Avoid giant numerals and excessive copy. New product copy must contain no em dashes.

The user asked for the visual improvement, so proceed with implementation and inspect the rendered result. Do not stop at another explanation of what could be improved.

## Behavior to preserve

This is a presentation refinement. Keep the existing live assessment flow:

1. Record activates the camera and starts sampled live analysis after camera readiness, using the camera-analysis consent already saved in setup/Settings.
2. Stop ends uploads and releases the camera. A valid latest reading becomes reviewable. Invalid or stale readings cannot be saved.
3. Stable capture can complete automatically. Shoulder capture retains its resting-arm baseline, raising and holding phases.
4. Nothing is saved automatically. Save result persists the reviewed measurement. Shoulder review saves both sides.
5. Retry starts a fresh capture. Failed saves can retry with the same record identities.

Additional constraints:

- Keep a clearly titled Camera tray and dedicated camera box in every stage. Off, missing-service, missing-camera and permission-blocked states show useful placeholders without collapsing the box.
- Keep invalid-pose corrections visible and retain usable detected markings. Clear stale markings when frames stop arriving.
- Preserve cleanup on leaving the screen, backgrounding, consent revocation and source changes. Ignore late results from an invalidated session.
- Keep consent persistent. Do not add per-capture consent prompts or return to video-file uploads.
- Preserve simulated provenance, explicit demo labels and separate demo-profile saves.
- Preserve pending-save guards. Retry and resetting review must not discard a capture while its save is unresolved.
- Keep measurement, capture-quality/source and action information in coherent trays. Longer explanations belong in local detail views with breadcrumb returns.
- Do not change measurement geometry or stability thresholds as part of styling.

## Navigation and shared completion contract

`AssessmentReview` owns its local detail selection. `LiveAssessment` owns the reviewed result and save state. Returning from a detail view must not restart capture or replace the reviewed result.

`LiveAssessment` exposes optional `onCompletionChange`. `AssessmentScreen` stores its value and forwards it as the `completion` prop to `TabScreen`.

The coordinator's shared API is:

```ts
completion?: {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
} | false;
```

Its default bottom control is **Close**, distinct from Save result. The assessment supplies these overrides:

- In a detail view, Close returns to Review without discarding the result. This navigation remains safe during a pending save.
- In Review, Close resets to the capture stage. It is disabled while saving, and the reset handler also guards against a pending save.
- In capture, the override is `undefined`, allowing the shared default Close to return to the canonical parent, normally Data.

The JSX spread in `AssessmentScreen` allowed the assessment commit to compile against the older baseline that did not yet declare `TabScreen.completion`. The shared completion behavior requires the coordinator's implementation to be integrated. Once that API is present, normal explicit prop syntax is fine.

Do not add another generic footer inside the assessment. Keep clear breadcrumb return paths. No new global route is required for the current local review/detail views.

## Verification and continuation

Before the assessment handoff, these checks passed:

- Full Jest suite: **764 tests across 55 suites**.
- Typecheck.
- Full lint with 76 existing warnings; scoped lint had no code warnings.
- Web production build, with a bundle-size warning.
- Independent code review, with no actionable findings.

Canon TDD observed meaningful failures before implementing the permanent camera box, no-service presentation, tray grouping, review/detail navigation, capture-source details and local completion hook. Existing lifecycle, persistence and demo tests remained regression coverage.

Run relevant checks after changing the UI, using the repository's installed dependencies:

```sh
npm --prefix apps/mobile test -- --runInBand --runTestsByPath \
  ../../packages/app/src/capture/__tests__/LiveAssessment.test.tsx \
  ../../packages/app/src/__tests__/assessmentPresentation.test.tsx \
  ../../packages/app/src/__tests__/cameraEntry.test.tsx \
  ../../packages/app/src/__tests__/LiveAssessmentApp.test.tsx \
  ../../packages/app/src/__tests__/capture.test.tsx \
  ../../packages/app/src/__tests__/demo.test.tsx
npm run typecheck
npm run lint
npm run web:build
```

Those commands assume dependencies installed for this checkout. The earlier isolated-worktree run temporarily reused read-only dependency symlinks, put Jest/Vite caches in `/private/tmp`, and used Vite's `runner` config loader to avoid writes through shared dependencies. The symlinks were removed after verification. Do not install or write caches through another checkout's dependency symlink. If working in parallel, avoid its dev port, including port 5173.

**Rendered visual acceptance remains outstanding.** Inspect both assessments at phone and desktop widths in idle, startup, live correction, completed review, both detail views and saved states. Check missing-service and denied-permission placeholders too. The previous worker left browser validation to the coordinator; do not describe the visual design as finished without inspecting it.
