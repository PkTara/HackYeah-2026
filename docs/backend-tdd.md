# Backend TDD and validation record

This is the record of the first backend implementation (3 October 2026), before the video, live camera and assessment work; numbers below are from then. Run `npm run backend:check` for the current state.

Implemented on `codex/climbing-monkey-backend`, beginning with a pytest/HTTPX fixture and an otherwise empty FastAPI app. The first executable behavioral failure was `/health` returning 404 instead of 200; the health handler was added only after that run.

## Method

Canon TDD: choose one pending behavior, add one runnable test, observe the missing behavior, implement the minimal change, run the relevant regression suite, then refactor while green. Import/runner problems were treated as setup issues, not behavioral reds. Test configuration, package setup and declaration stubs preceded implementation where necessary to make failures executable.

Framework-provided or already-covered boundaries were kept as passing characterization tests. We did not intentionally break valid code to fabricate a red. Domain agents worked in separate files; the parent owned HTTP integration and persistence. An independent reviewer checked profile logic and the complete backend, and findings were reproduced with new failing tests before fixes.

## Observed examples

| Behavior | Observed red | Green implementation |
|---|---|---|
| Create/read identity | Missing endpoint, 404 | Anonymous bearer identity |
| Restart identity | New app rejected token, 401 | SQLite persistence with token hash |
| Evidence collections | Missing endpoint, 404 | Owner-bound record APIs |
| Reject wrong units | Invalid angle accepted, 201 | Metric/unit validation |
| Reject low-confidence camera result | Accepted as valid, 201 | Camera confidence threshold |
| Chronological history | Offset/fractional timestamp order wrong | UTC normalization and datetime ordering |
| Profile derivation | Missing domain result / missing endpoint | Independent descriptive style summaries |
| Quest completion | Missing action, 404 | Atomic status transition and XP |
| Current hand context | Wrong quest kind / assigned when stale | Eligible check-in alternative and pause behavior |
| Private photo linking | Photo ID rejected / wrong hand accepted | Owned, side-matched annotation links |
| Retained photo deletion | Missing delete action, 405 | Delete image and clear links, retain history |
| Landmark confidence omission | Assumed confidence 1, accepted | Explicit visibility required |
| Camera confidence omission | Assumed confidence 1, accepted | Explicit camera confidence required |
| Numeric overflow | 500 for JSON `1e400` | Safe 422 validation response without echoing raw input |
| Goal changed before completion | Stale quest granted XP, 200 | Refresh goal and eligibility under write lock, 409 |
| Evidence changed before assignment | Immediately stale candidate inserted | Build candidate under write lock |
| Body-length / repetition semantics | Zero length / fractional count accepted | Positive length / whole repetition count |
| Local database/CORS configuration | Config ignored / preflight 405 | Explicit environment configuration and allowed-origin policy |

## Automated scope

HTTP tests use actual FastAPI request validation and a real temporary SQLite database. They cover identity isolation, record persistence/deletion, export, identity deletion, historical heatmaps, photo consent/normalization, annotated-photo deletion, stale quests, skip behavior, levels, concurrent completion retries and restart persistence. There is no mocked database.

Pure profile tests cover unknown values, independent terrain/movement/grid dimensions, evidence-linked focus, comparable assessment history, latest hand reports and descriptive activity context. Pose tests exercise geometry, aspect correction, invalid input, real image decoding and native-adapter lifecycle; only the expensive inference boundary is replaced for deterministic unit tests.

The complete development environment includes the optional MediaPipe extra. A fresh installation with only the test extra was also checked; the two tests using the optional real MediaPipe image container skip there. Model files are not required for the normal suite.

## Manual integration evidence

A localhost Uvicorn smoke test exercised health, identity creation, evidence submission, derived profile, quest assignment, completion, idempotent completion retry, OpenAPI generation and identity deletion over real HTTP. The schema exposes 22 distinct paths.

An official public sample image with Google's Pose Landmarker heavy model produced a real inference result outside the macOS sandbox. This establishes adapter integration, not physical-test accuracy; camera geometry remains uncalibrated. The sandbox prevented Metal initialization and aborted native inference, so the model must run in a supported execution environment.

## Other checks

The test stack emits one upstream Starlette/AnyIO deprecation warning. It does not change test outcomes. Clinical content, OAuth/provider integrations and calibrated style scoring are explicitly later work; no tests or mocks claim they are implemented.

Final verification: **114 passed**, **99% statement coverage**, Ruff checks and formatting passed, dependency check passed. Fresh core-only environment: **112 passed, two optional MediaPipe-container tests skipped**. The final scoped re-review approved all four initial findings. `.github/workflows/backend.yml` runs the same tests and Ruff checks on pushes and pull requests that touch `backend/`.
