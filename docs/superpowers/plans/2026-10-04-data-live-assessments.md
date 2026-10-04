# Data and Live Assessments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Group Data meaningfully, enable consent-controlled live marked assessments, and persist shoulder/finger measurements with breadcrumbs throughout.

**Architecture:** Extend the existing FastAPI/WebSocket and capability interfaces. Separate backend geometry, client assessment persistence, live capture/overlay, and app consent/navigation into independently owned changes. Share the contracts in the spec; integrate in the current checkout so the running browser receives updates.

**Tech Stack:** Python/FastAPI/Pydantic/pytest; TypeScript/React Native/react-native-web/Jest/Vite.

**Spec:** docs/superpowers/specs/2026-10-04-data-live-assessments-design.md

## Global Constraints

- Canon TDD: one executable behavior, observed red, minimal green, regression.
- Breadcrumbs on every submenu, including demo/settings/setup.
- No video-file upload in the assessment UI; sampled live frames with backpressure.
- No upload permission inferred from old data, skipped setup or demo activation.
- Finger force requires instrument input and matching conditions; no camera force estimate.
- Explicit simulation provenance; normal/demo records and identities remain isolated.
- Python 3.12–3.13; preserve existing API defaults and saved profiles.

## Task 1: Backend geometry, streaming and record validation

Files: backend/src/climbing_monkey/{pose,video,video_routes,schemas,profile}.py; backend/tests.
Produces: stream and assessment JSON exactly as the spec's Contracts section defines.

- [x] Add one geometry test at a time, starting with `assert analyze_shoulder_landmarks(front_pose)['left_value'] == pytest.approx(180)`; observe red and implement the projected shoulder calculation with visibility/straight-elbow validation.
- [x] Test selected stream metric/landmarks/dimensions and rejected selector; preserve default leg behavior and injected detector boundaries. Send `{'type':'start','token':token,'upload_consent':True,'metric':'shoulder_reach'}` and assert a returned side pair.
- [x] Test POST manual finger-force setup persistence; invalid force/unit/setup/camera method must return 422. POST shoulder camera side metrics must retain explicit confidence.
- [x] Group backend trends by matching side/setup/simulation as well as metric/unit/method/protocol. Run backend checks and record evidence.

## Task 2: Assessment history and finger-force input

Files: packages/core/src/{assessments,game,index}.ts; packages/data/src/{backend,local,http,wire}.ts; packages/app/src/state/GameProvider.tsx; new FingerStrengthScreen/AssessmentSummary; corresponding tests.
Consumes: Task 1 assessment JSON. Produces: AssessmentRecord contract, history migration, backend/useGame saveAssessment, FingerStrengthScreen and AssessmentSummary exports.

- [x] Test `gameReducer(emptyGame,{type:'saveAssessment',record}).assessments` retains each record; parse legacy state as empty history. Observe red then implement validation/history.
- [x] Extend wire DTOs per shared contracts early, then test local and HTTP save/reload preserving force setup, camera records and timestamps. Normal reset removes history.
- [x] Test `comparableAssessments(records)` compares only equal setup/side/unit/method/protocol/provenance. Display latest records and comparable changes.
- [x] TDD FingerStrengthScreen validation/review/save and demo fill through the same form. Render Crumbs and TabScreen; parent wires its route. Run focused tests/typecheck and record evidence.

## Task 3: Live capture, overlay and automatic completion

Files: packages/data/src/{live,media}.ts; packages/platform/src camera contracts/previews; new packages/app/src/capture/LiveAssessment.tsx and stability/overlay modules; demo camera/media; corresponding tests. Do not edit wire.ts or parent-owned routing/privacy screens.
Consumes: extended PoseResultDto supplied by Task 2. Produces: startLive fourth metric selector, timestamped callback, overlay and `LiveAssessment({media, consent, metric, simulated, onSettings, onSave})` where onSave accepts readonly AssessmentRecord[].

- [x] TDD handshake selector and callbacks preserving landmarks/timestamp; stopping in a result callback schedules no next frame.
- [x] TDD stability state machine: resting arms never complete; relative raise followed by valid hold completes; invalid frames/gaps reset; manual stop remains possible.
- [x] TDD preview overlay coordinates for letterbox and native crop; remove stale points. Propagate dimensions/mirroring through camera capability.
- [x] TDD Record starts camera/live once ready, Stop/automatic completion/revocation/background/unmount stop uploads, result review/save and retry. No photo/video analysis controls in new component.
- [x] Extend labelled demo live samples for both selected measurements and realistic phase progression. Run focused regressions and report.

## Task 4: Consent, Data grouping, breadcrumbs and integration

Files: new app privacy context/settings; App; onboarding; TestsScreen; navigation routes/trail; demo controls; ProfileScreen; app tests/docs.
Consumes: Tasks 2–3 exports. Produces: Data tab, Settings route, mounted live screen, assessment summaries and complete breadcrumb navigation.

- [x] TDD persisted opt-in false for legacy/new users; setup privacy choice; Settings revoke stops active upload via live component prop. Privacy store independent from personal/demo data. Hand retention remains distinct.
- [x] TDD Data categories and renamed tab/breadcrumb labels. Wire body/reach, categorized home tests, live leg/shoulder buttons, FingerStrength, activity/hand links, summaries and settings utilities.
- [x] TDD canonical breadcrumb parents for every pushed route and breadcrumb back in demo/settings/setup submenus, including direct links.
- [x] Replace obsolete per-capture camera UI tests with new Record/Stop/consent/measurement tests; retain backend transport/media/hand regressions. Validate profile history, demo isolation and real/mock source combinations.
- [x] Review integrated changes, resolve findings, run `npm run check`, `npm run backend:check`, `npm run web:build`, browser smoke and git diff checks. Update disclosure/docs; commit and push current branch.

## Execution evidence

Implemented in the current feature checkout with independent file ownership. Backend, history/force and live capture received scoped reviews; the integrated feature received a whole-branch review and a scoped fix review. Full verification: 756 Jest tests, 237 backend tests, typecheck/lint/Ruff and web build. Browser simulated capture/save and real model/WebSocket probes passed; physical webcam/native hardware remains unverified. Tests for the old per-capture video UI were replaced with live flow and stored-permission checks, preserving hand-journal regressions.
