# Claude handoff: redesign Climbing Monkey's UI

## The user's assessment

The user is dissatisfied with Codex's execution and wants Claude to take over the UI design. Their core criticism is: **the UI is not clean, and it is not clear how the app works or what inputs it needs.** The research presentation has also been too detailed, sometimes irrelevant, and a wall of text.

Do not treat the current layout as an approved design. Passing tests and adding citations did not resolve the user's usability concerns. They are asking for a better product experience, not another layer of explanatory controls.

## What went wrong in my work

These are concrete problems in my implementation to review, not additional requirements invented on the user's behalf:

1. **I added explanation machinery instead of designing a coherent journey.** Repeated help controls, status labels, source cards and nested trays made the interface busy. Later collapsing them reduced text but did not establish a clear hierarchy.
2. **I did not make the inputs understandable enough.** Climb logs, hand check-ins, body measurements, home tests and camera readings are spread across different places. A new user should know what to enter, why it matters, whether it is optional, and what happens after saving.
3. **I exposed implementation detail as product explanation.** Rule IDs, machine-style field names, booleans, protocol strings and backend configuration instructions are poor primary-screen content. They belong in optional technical detail, if anywhere.
4. **I over-presented the research.** Full author lists, sample descriptions, reading depth, verification dates and repeated caveats overwhelmed the relevant takeaway. Some papers only provide background and do not support the exact recommendation. A long bibliography is not a clear rationale.
5. **I did not make capability and readiness clear enough.** Manual entry, stopwatch/counter input, camera preview, camera inference and future placeholders can look like comparable working tests. The isolated preview requires a backend for camera assessment, while newer work exists elsewhere. Users need a clear distinction between what they can do now and what is unavailable.
6. **I iterated on isolated widgets rather than assessing the whole experience.** Superscript question marks and minimized trays were requested improvements, but the user still rejects the execution. Those patches are not proof of good UX.
7. **I did not distinguish verification from design success strongly enough.** Automated tests passed; that does not establish clean design, understandable input flows, useful coaching, or scientifically valid measurements.

Please inspect the actual app before deciding which changes address these issues. The original checkout has newer changes than the isolated preview; do not assume every screen still matches my descriptions.

## Explicit preferences the user has already given

- Keep the UI clean and make inputs and their purpose clear.
- Explain how recorded information produces a useful insight or next action.
- A small superscript question mark can reveal the reason and sources for generated content.
- Personal input records should start minimized.
- Put slab/vertical/overhang tally explanations below the triangle in an optional **How was this data created?** section.
- Avoid prominent **Draft suggestion**, **Example**, and similar status badges.
- Keep research short, readable and relevant; full evidence should remain available on demand.

These preferences should guide the redesign, but do not preserve my accordion-heavy architecture merely because it implements the words literally. The user still finds the result bad.

## What Claude should do

Start from the climber's journey: **record an observation -> understand the result -> choose a next action**. Establish a clear hierarchy and grouping for the inputs and results. Use plain language that answers what the user should do and why. Audit the full phone and desktop experience rather than polishing only individual cards.

Keep research/provenance useful and available without making it the primary interface. Show the specific personal observation behind a suggestion. Attach a relevant source where a published claim is made; arithmetic and software selection rules can be explained from their inputs without borrowing authority from unrelated papers. A suggested practice task must not quietly become a proven diagnosis or prescription.

You may replace components, reorganize screens and rethink the presentation. Preserve the important data contracts and existing work by others.

## Research and data boundaries to preserve

- The user's own records support personal completion counts and trends. Scholarly papers are a separate source of background or claim-specific evidence.
- Keep actual record IDs, dates, values, methods and source links available. Clearly label synthetic display references; unavailable provenance must stay unavailable.
- Preserve server assignment-time snapshots. Current local focus and an older assigned server task may use different inputs and selection rules.
- Deleting a record must redact its copied details from stored decision snapshots.
- Camera visibility is not measurement accuracy. Projected image geometry is not validated anatomical mobility or a grade prediction.
- Hand photos and discomfort journals do not diagnose internal finger injuries, establish healing, or clear someone for climbing.
- No located direct evidence validates the exact prototype drills/doses, three-log threshold, lowest-send-rate personalization, or effectiveness of the pause/check-in rule.
- The existing research includes small samples, abstract-only reading, contextual pose studies, laboratory tissue experiments and a single tendon case. Do not turn them into general clinical or training guarantees.
- The isolated branch uses structured/manual observations and deterministic rules. It does not interpret free-text notes into training decisions. Future extraction should link to original material and allow confirmation/correction.

## Where the files are

### Original checkout — newer and actively edited

`/Users/jgray/Documents/repos/HackYeah-2026`

Branch observed during handoff: `codex/climbing-monkey-backend`; HEAD `b25b176`. It contains newer Data/category and camera/assessment work, plus uncommitted changes from other chats in backend records/profile, climbing styles, Hands, Log, Profile, Tests and data mapping. **Do not overwrite, reset, stash or discard those changes.** Inspect the current state; this note is a snapshot, not a permanent branch-status guarantee.

### My isolated implementation

`/Users/jgray/.codex/worktrees/climbing-evidence/HackYeah-2026`

Branch: `codex/climbing-evidence`; handoff HEAD `d182e30`. It began at fetched `origin/main` commit `3d2eaae`. It does not contain all the newer work in the original checkout. Reconcile deliberately before implementation.

Preview: `http://127.0.0.1:5196/`, served from that isolated worktree, currently local/demo mode without an API URL.

### Research packet

- [Complete research dossier](claude-handoff/research.md): the original 12 investigations, five additional journal studies, separately labeled conference context, study populations, access/reading depth, limits and claim-gap mapping.
- [Decision/data contracts](claude-handoff/decision-pipeline.md): detailed pipeline and provenance behavior for the isolated branch.
- [Public-only bibliography sent to Claude](claude-handoff/public-research.md).

The long dossier is an appendix for Claude to assess. It should not be copied into the main UI.

### Relevant isolated-branch implementation

- `packages/app/src/screens/ProfileScreen.tsx`: focus, quests, terrain/movement displays and rewards.
- `packages/app/src/screens/TestsScreen.tsx`, `HomeTestScreen.tsx`, `AssessmentScreen.tsx`: manual inputs and server-dependent camera assessment.
- `packages/app/src/screens/LogScreen.tsx`, `HandsScreen.tsx`: observation entry.
- `packages/app/src/components/DecisionHelp.tsx`, `ExpandableTray.tsx`, `resultExplanations.ts`: my disclosure presentation, which is replaceable.
- `packages/core/src/evidence.ts`: source registry and explanation builders.
- `packages/core/src/climbing.ts`, `quests.ts`: local decision rules.
- `packages/data/src/wire.ts`: record/decision DTO preservation.
- `backend/src/climbing_monkey/{profile,quests,pose,store}.py`: server rules, snapshots, geometry and deletion redaction.
- `docs/camera-video.md`, `packages/vision/README.md`: capture/inference and developer-harness boundaries. Verify against newer code before relying on their status descriptions.

The stack is shared React Native/react-native-web, Vite and Python/FastAPI. Preserve native compatibility when changing shared components.

## Verification context

My isolated branch last passed 44 Jest suites / 710 tests, typecheck, lint and the web build. Its backend last passed 207 tests. These counts do not apply automatically to the original checkout or future changes. They are regression checks, not UX validation or evidence of camera accuracy. Re-run relevant checks and inspect real user flows after the redesign.

## Handoff privacy/status

The user chose to keep the code/implementation handoff as a local Markdown file. **Do not treat this as permission to upload private repository context elsewhere.** Only the public bibliography/general research boundaries were sent to Claude Code; Claude acknowledged those 17 citations. The private code packet was not transmitted. This file is the local, reviewable handoff the user can give to their Claude session.
