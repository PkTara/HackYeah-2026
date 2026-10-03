# Climbing Monkey backend

Python/FastAPI first implementation on `codex/climbing-monkey-backend`. Product authority: [app design](climbing-app-design.md) and [sports alignment](climbing-monkey-alignment.md). Execution scenarios: [TDD plan](superpowers/plans/2026-10-03-backend.md).

## Boundaries

The server stores confirmed evidence and derives profile/quest results. React Native owns capture guidance, chart rendering, permission prompts, local credentials and explicit consent before transmitting photos. Server processing is optional; manual assessments and style logs work without pose inference.

Anonymous profiles receive a random bearer token once. The token is a capability to that profile, not a complete account/login system; clients must protect it. Store only its SHA-256 digest. All personal routes use `/v1/me`, so callers cannot switch identities by supplying another person's ID. No third-party OAuth, deployments or clinical care decisions are included in this first implementation.

SQLite stores identities, evidence and quest state with foreign-key deletion and atomic quest completion. Uploaded pose images are transient. Hand-journal photos require separate retention consent and stay in private storage accessible through authenticated API calls. Production operation needs HTTPS, backup/retention policy and deployment-level abuse controls before public exposure.

## API surface

| Method and route | Behavior |
|---|---|
| `GET /health` | Process health |
| `POST /v1/climbers` | Create anonymous profile and issue token once |
| `GET/PATCH/DELETE /v1/me` | Read preferences, update goal/name/pet visibility, delete identity and records |
| `POST/GET /v1/me/climbs` | Record/list terrain and movement outcomes with grading context |
| `POST/GET /v1/me/assessments` | Record/list confirmed manual/camera metrics with protocol and provenance |
| `POST/GET /v1/me/hands` | Record/list side/region discomfort, note and optional retained-photo link |
| `GET /v1/me/hands/heatmap` | Latest reported severity per location, or historical snapshot with `at`; unknown remains null |
| `POST/GET /v1/me/activities` | Manual activity context; real provider imports remain later |
| `DELETE /v1/me/{climbs,assessments,hands,activities}/{id}` | Delete owned evidence and recompute derived results |
| `GET /v1/me/profile` | Terrain/movement/grid summaries, unscored radar axes, comparable assessment trends, current hand flags and explained focus |
| `GET /v1/me/quests` | Current and historical assignments |
| `POST /v1/me/quests` | Explicitly assign one appropriate quest; retry returns existing active assignment |
| `POST /v1/me/quests/{id}/complete` | Recheck eligibility, mark completed and award XP once |
| `POST /v1/me/quests/{id}/skip` | Skip without XP loss |
| `GET /v1/me/pet` | XP, level and cosmetic milestone |
| `POST/GET /v1/me/photos` | Retain image with consent / list private metadata |
| `GET/DELETE /v1/me/photos/{id}` | Read/delete only owned photo; deletion removes annotation links |
| `GET /v1/me/export` | Export own records, photo metadata, quests and progress |
| `POST /v1/pose/landmarks` | Estimate planar leg-spread angle from client-provided normalized landmarks |
| `POST /v1/pose/image` | Consented transient image analysis using optional configured MediaPipe model |
| `POST /v1/pose/video` | Consented, bounded MP4/MOV/WebM analysis with sampled timestamped results |
| `WS /v1/pose/stream` | Consented/authenticated sequential camera frames through one VIDEO-mode detector |

Accepted input schemas are published by FastAPI at `/docs` and `/openapi.json`. Response shapes are described in [backend setup/API notes](../backend/README.md) and protected by tests, including invalid inputs, unknown resources, repeat completion and identity isolation. Some derived response schemas remain generic in OpenAPI; typed client-generation models are subsequent work.

## Meaning of the profile

Terrain/movement summaries are **observed completion statistics** with counts and evidence IDs. They are not calibrated ability values or terrain-specific grade predictions. The three terrain dimensions vary independently. The movement radar returns unknown for techniques that do not yet have validated observations; clients must not turn null into zero.

Assessment trends compare the latest record only with matching metric, unit, protocol and method. Current hand flags use the latest dated report for each side/region; a zero rating clears that location's active flag. Old symptoms remain in history. Removing records recalculates the profile; task completion never changes measured ability.

Quest selection uses explicit evidence rules. Insufficient data yields an assessment/logging task; supported terrain observations can yield reflection; active hand discomfort prioritizes a check-in. These do not claim medical clearance or automatically prescribe exercises. Stretching/practice content needs a reviewed task library before it can be offered as a supported intervention.

Assignment computes the candidate after acquiring SQLite's write lock; completion refreshes preferences and eligibility while holding that lock. Completed retries return the previous completion without another reward. Read-only quest history projects stale assignments as paused without modifying the database.

## Pose measurements

MediaPipe Tasks identifies landmarks. The first measurement estimates the image-plane angle between ankle directions from the hip midpoint, accounting for image aspect ratio when dimensions are supplied. It is camera-derived geometry, not true three-dimensional flexibility, force, arm-span calibration or diagnosis.

Video and sampled live frames now use the same geometry in a persistent temporal detector. Clips preserve presentation timestamps, apply rotation metadata and downsample phone-resolution frames. The client shows live preview, supports snapshots and offers recorded-video/live analysis where the platform adapter exposes them. See [camera/video implementation](camera-video.md) for protocol, platform support and build limitations; see the [scientific evidence handoff](climbing-scientific-evidence.md) for claim boundaries.

Reject low visibility, missing landmarks, degenerate geometry and invalid/nonfinite coordinates. A successful result remains transient until the user confirms it through the assessment API. Missing model/runtime produces an explicit service-unavailable result rather than sample output. Server analysis requires explicit upload consent; pose images are not retained.

## Later features

Real health/Strava authorization, clinician-reviewed pain routing, broad form/video coaching, calibrated style scores and approved personalized stretching prescriptions require their own design and test scenarios. They are not silently represented by mock services in this backend.
