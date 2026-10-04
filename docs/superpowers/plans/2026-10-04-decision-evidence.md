# Decision evidence implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement the scoped tasks, with test-first behavior changes and independent review.

**Goal:** Every generated climbing result or recommendation exposes the personal inputs, exact rule, relevant primary sources, and limits of the evidence through a tappable question mark.

**Architecture:** Core owns a typed research registry and decision explanations. Backend decisions retain snapshots of the triggering inputs; the data adapter preserves them. Shared app disclosure UI renders the explanation and original-paper links on both native and web.

**Tech Stack:** TypeScript, React Native/web, Python FastAPI, Jest, pytest.

**Spec:** User-approved design in the current chat: a question mark beside generated results and recommendations opens the records used, calculation/selection rule, research links, and what those sources support. Draft drills and the three-climb product threshold receive explicit labels. The user requested implementation from latest main and further research of gaps.

## Global constraints

- Work only in this separate worktree; preserve the original checkout.
- Separate personal evidence from published source IDs.
- Label product heuristics, unvalidated camera measurements, draft drills and example values accurately.
- Never claim papers validate the app, its exact doses, or personalized recommendations.
- Unknown legacy/server provenance must be shown as unavailable, never inferred as known.
- Preserve server rule IDs, input record IDs, dates, relevant values, and versions through the adapter.
- Research links must be stable original article or DOI URLs.
- No free-text interpretation subsystem is being introduced: document the existing structured input path and future confirmation boundary.

## Task 1: Decision contracts and provenance

Files: packages/core/src/evidence.ts, packages/core/src/index.ts, packages/core/src/quests.ts, packages/data/src/wire.ts, backend/src/climbing_monkey/quests.py and focused tests.

Interfaces: export ResearchSource and RESEARCH_SOURCES; DecisionExplanation {summary, status, rule, evidence: readonly {id,label,detail}[], sourceIds: readonly string[], limitations: readonly string[]}; explanation helpers for focus/quest/calculated counts, camera geometry and example radar. Quest gets optional decision: DecisionExplanation. Server decision uses source_ids; adapter maps it to sourceIds. Registry must use the 12 scoped sources already documented in docs/climbing-scientific-evidence.md; source entries include title/authors/year/url/studyType/population/readingDepth/supports/limitations/verifiedAt. Helpers consume actual GameState logs, focus and flags; server decision is authoritative for its quest. Unknown legacy server quests clearly report missing provenance instead of reconstructing it as fact.

- [x] Add one runnable regression test proving server quest evidence survives conversion; run it red, implement the minimal typed preservation, run green.
- [x] Add one runnable regression test proving the backend reflection quest includes the dated input records and explains the >=3 heuristic; run red, implement, run green. Repeat for discomfort and mobility branches as separate scenarios.
- [x] Add focused behavioral tests for local focus inputs, flags controlling pauses, draft quest limits, and unknown provenance one at a time. Implement helpers after each red run.
- [x] Populate the curated source registry from the research handoff; check references resolve and limits remain scoped.
- [x] Run relevant Jest core/data and pytest profile/quest suites; report exact results and modified files.

## Task 2: Research gap investigation

Files: docs/climbing-scientific-evidence.md (append only), docs/decision-evidence.md.

- [x] Read the existing handoff and inspect local drills against their underlying claims.
- [x] Read primary research for route preview, technique/video feedback, training intervention efficacy. Verify study type, population and outcomes; state full-text versus abstract access.
- [x] Append new verified entries and a claim-gap table. Distinguish lack of located direct evidence from proof of ineffectiveness. Never invent content review.
- [x] Document the implemented input -> structured observation -> deterministic rule -> disclosure path, the confirmation boundary for any future free-text extraction, and evidence limitations.

## Task 3: Shared disclosure UI and integration

Files: packages/app/src/components/DecisionHelp.tsx, packages/app/src/screens/{ProfileScreen,EvidenceScreen,HandsScreen,AssessmentScreen,TestsScreen,HomeTestScreen,AboutScreen}.tsx, packages/app/src/capture/parts.tsx, applicable onboarding generated-value screens, app tests.

Consumes: the Task 1 explanation and registry exports. Produces accessible tappable '?' buttons which reveal a readable explanation and original sources using Linking.openURL, close/toggle semantics, and separate records/rules/research/limits sections. Every visible generated result or recommendation has a disclosure at the relevant panel/reading; raw manual inputs do not need an invented research citation.

- [x] Add one runnable disclosure test: collapsed initially; pressing '?' reveals actual supplied evidence, rule and source link; run red, implement minimal component, run green.
- [x] Add legacy/no-source disclosure behavior as a separate test; run red then green.
- [x] Integrate focus, quests (Profile and Hands), pausing, terrain/movement tallies and example radar. Explain local profile versus server quest authority instead of claiming shared rules.
- [x] Integrate camera estimated readings, assessment/home-test derived values, and gamification/reach ratios with appropriate metadata and app-rule labels.
- [x] Add the research library and data-flow explanation to About, preserving original paper links and study limitations.
- [x] Add integration tests that exercise opening help from real screens with current input data.
- [x] Run typecheck, lint, full Jest, backend pytest/ruff and web production build. Inspect actual rendered web/native-compatible UI for readability and accessibility.

## Review and completion

- [x] Independently review the resulting diff against the approved requirements; fix material defects and re-run relevant checks.
- [x] Keep the completed worktree and branch for user review; do not merge or publish without a request.

## Completion evidence

Implemented on `codex/climbing-evidence`, created from fetched `origin/main` commit `3d2eaae`. Research, contract and UI task reviews passed, followed by an independent whole-branch review of `3d2eaae..84fe0ad` with no material findings. The worktree is retained as requested.

The implementation extends the initial contracts with optional authoritative reach snapshots (two independently dated height/span records), local completion/skip selection controls, valid camera coordinate/dimension snapshots, and atomic deletion redaction of copied quest input details. All 17 journal-source entries are bundled; the separately labeled conference source remains research context in documentation. Generated display references are explicitly distinguished from original record IDs.

Final checks: `npm run check` passed (typecheck, lint with no errors, full Jest); the final refreshed Jest run passed 44 suites / 704 tests. Full backend pytest passed 207 tests; Ruff check and format passed. The final production web build passed with a bundle-size advisory. Browser QA checked the desktop and 390-pixel layouts, input/rule/source disclosures, all 17 original-paper links rendered, and a real paper opening through the corrected DOI to the publisher. No physical native-device execution or scientific measurement validation is claimed.
