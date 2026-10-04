# Climbing Monkey backend

FastAPI service for the profile → eligible quest → monkey XP loop, with image, recorded-video and sampled live-camera analysis. Python **3.12** is the tested setup (3.13 is permitted; 3.14 is excluded). SQLite, Pydantic and pytest keep the service small and independently testable. See [backend design](../docs/backend-design.md), the [camera/video guide](../docs/camera-video.md) and [scientific evidence handoff](../docs/climbing-scientific-evidence.md).

## Setup and checks

From `backend/`, using Python 3.12:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -c constraints.txt -e '.[test]'
.venv/bin/python -m pytest --cov=climbing_monkey --cov-report=term-missing
.venv/bin/ruff check src tests
.venv/bin/ruff format --check src tests
```

`constraints.txt` pins the tested Python 3.12 dependency versions. Constraints only apply to packages selected by the requested extras; the basic install does not install MediaPipe. Tests involving the real MediaPipe image container skip if that optional dependency is missing. The pure geometry, HTTP and database tests run without a model or network.

Root shortcuts: `npm run backend:setup` (creates `backend/.venv` with Python 3.12 and installs the test extra), `npm run backend:test`, `npm run backend:check` and `npm run backend:start`.

## Run

```sh
.venv/bin/python -m uvicorn climbing_monkey.main:create_app --factory --host 127.0.0.1 --port 8000
```

Swagger UI: [localhost:8000/docs](http://localhost:8000/docs). Schema: `/openapi.json`. Health: `/health`.

Configuration:

| Variable | Purpose |
|---|---|
| `MONKEY_DATABASE_PATH` | SQLite file path; default is `backend/data/monkey.sqlite3` in this editable checkout |
| `MONKEY_CORS_ORIGINS` | Comma-separated allowed browser origins, e.g. `http://localhost:5173`; unset means no cross-origin browser access |
| `POSE_MODEL_PATH` | Optional local MediaPipe Pose Landmarker `.task` model; unset makes image inference return 503 |

Data, virtualenvs, models under `backend/data/` and caches are gitignored. Keep runtime databases and photos out of version control. Production hosting needs HTTPS, an intentional data-retention/backup policy and request/rate limits before exposing the service publicly. No deployment is included here.

## Identity and evidence

Create an anonymous climber:

```sh
curl -X POST http://localhost:8000/v1/climbers \
  -H 'Content-Type: application/json' \
  -d '{"name":"Climbing Monkey","goal":"technique"}'
```

The response contains the profile ID and a random `token`. Save that token privately in the client and send `Authorization: Bearer <token>` on every personal/pose route. It is returned once and only its hash is stored. There is no email/password login or token recovery; losing the token loses access to that anonymous profile. Swagger's **Authorize** button accepts it.

Input examples:

```json
{"terrain":"vertical","movements":["dynamic","controlled"],"holds":["crimp","pinch"],"completed":false,"attempts":3,"grade":"6A","grade_system":"font","location":"My gym"}
```

Post to `/v1/me/climbs`. A climb log records one terrain and one or more movement styles. Send `movements` (any combination of `controlled`, `dynamic`, `technical`, `powerful`, `balance`, `coordination`, `compression`, and `endurance`, no repeats), the older single `movement`, or both; when both are sent, `movement` must be one of `movements`. The server stores both fields with `movement` as the first of `movements`, so clients that read only `movement` still receive a single style. Records saved before `movements` existed have only `movement`; the profile reads them as `[movement]`, and clients should do the same. `holds` optionally lists hold types (`jug`, `crimp`, `sloper`, `pinch`, `pocket`, `volume`, no repeats; default empty). `attempts` is optional (1 to 1000); it is null when not recorded. Avoid interpreting style or hold tags as mutually exclusive physical abilities.

```json
{"metric":"leg_spread","value":90,"unit":"degrees","method":"manual","protocol":"front-facing-leg-spread-v1"}
```

Post to `/v1/me/assessments`. Supported metrics: `leg_spread/degrees`, `shoulder_reach_left/degrees`, `shoulder_reach_right/degrees`, `height/cm`, `arm_span/cm`, `pullups/repetitions`, `hang_duration/seconds`, and `finger_force/N|kgf` (newtons or kilogram-force). Camera assessments support leg spread and shoulder reach and require explicit confidence ≥0.7. Shoulder records retain each side separately; an optional `side` must agree with the metric. Projected angles must be between 0° and 180°. A persisted camera result is a **user-confirmed report**, not proof the server measured it; never treat client-supplied confidence as independent verification. Optional `model_version` records provenance. All assessments accept `simulated` (default false); simulation is preserved and excluded from comparisons with real records.

Instrument finger force is a manual report from an external instrument, never a camera force estimate. Force, edge depth and effort duration must be positive finite numbers; `side` (`left`, `right`, or `both`) and the complete `setup` are required. Example:

```json
{"metric":"finger_force","value":450,"unit":"N","method":"manual","protocol":"instrument-finger-force-v1","side":"left","setup":{"instrument":"Load cell","grip":"half_crimp","edge_mm":20,"arm_position":"straight","effort_seconds":7},"simulated":false}
```

Grip accepts `open_hand`, `half_crimp`, or `full_crimp`; arm position accepts `straight` or `bent`. Units remain as entered; the service does not mix newtons with kilogram-force in trends.

```json
{"side":"right","region":"ring_finger","pain":4,"spots":["a2","pip"],"note":"Observed after my session"}
```

Post to `/v1/me/hands`; add `photo_id` to link an owned photo of the same hand. `pain` is optional: null (or left out) means sore with no intensity rating, which still counts as an active flag; 0 means no discomfort and clears the location. `spots` optionally lists where it hurts as spot ids from the app's `packages/core/src/spots.ts`, such as `a2` or `pip` (lowercase letters, digits and hyphens, up to 32 characters each, at most 24, no repeats; default empty). `GET /v1/me/hands/heatmap` returns the latest report per side/region. A location nobody reported has `pain`, `occurred_at` and `evidence_id` all null; a report without a rating has null `pain` but keeps its `occurred_at` and `evidence_id`; zero is an explicit report of no discomfort. `?at=2026-10-03T10:00:00Z` requests a historical snapshot.

```json
{"kind":"bouldering","duration_minutes":45,"source":"manual"}
```

Post to `/v1/me/activities`. There is no claimed live Strava/health connection. Each evidence body accepts an optional timezone-aware `occurred_at`; otherwise the server assigns current UTC. Lists sort by actual instant. Unknown fields, inconsistent units, invalid ranges and nonfinite values return 422.

Each evidence collection supports `GET` and `DELETE /v1/me/{collection}/{id}`. `GET /v1/me/export` exports your profile, records, photo metadata, quests and pet. Fetch retained image bytes through each private photo route. `DELETE /v1/me` deletes the identity and cascades all records, photos and quests, invalidating its token. This is logical database deletion; forensic secure erasure and backup deletion require a production retention policy.

## Profile, quests and pet

`GET /v1/me/profile` returns:

- Independent `terrain`, `movement` and `grid` summaries: counts, observed completion rate and evidence IDs. `ability_score` remains null. A climb with several styles counts under each of its movements in the `movement` and `grid` summaries, and once in `terrain`.
- `radar`: five axes (`precise_footwork`, `balance`, `body_tension`, `sustained_effort`, `dynamic_coordination`), the same team rule as the app's `packages/core/src/movement.ts`. An axis is `null` until it has 3 matching climbs or, for sustained effort, a manual `hang_duration` record; do not render null as zero. A scored axis is `{level, level_name, points, climb_count, sent_count, test_points, long_sessions, evidence_ids}`: 1 point per completed matching climb, 0 to 3 for the hang (marks 20, 40, 60 s) and 1 per UTC day with 5 or more climbs (sustained effort only); Started under 4 points, Building from 4, Established from 8. The plank and one-leg balance tests stay on the device, so the server scores tension and balance from climbs alone. A count of the climber's records, not a skill score; see `docs/decision-evidence.md`.
- `assessment_trends` with latest result, comparable previous result and delta; comparisons require matching metric, unit, method, protocol, side, complete setup and simulation provenance. Legacy records without `simulated` are treated as real.
- `active_hand_flags` from the latest report per side/region (active when `pain` is null or above 0), `activity_context`, and an evidence-linked `focus`.

Completion rates are descriptive observations, not grade forecasts or proven technique scores. Grade systems/locations remain attached to records. The initial focus rule needs at least three observations with an incomplete outcome for a terrain reflection, and otherwise gathers evidence; it does not prove an underlying physical weakness.

`POST /v1/me/quests` assigns one current task and returns the existing eligible assignment on retries. Tasks have a reason, evidence IDs, title, instructions, version, estimated time and self-reported completion method. Current hand symptoms prioritize a journal check-in; a mobility goal prioritizes an assessment; a supported terrain focus produces reflection. Generic reflection/assessment behavior applies to the other current goals. Personalized stretching/practice routines need a reviewed library and are not shipped as prescriptions.

`GET /v1/me/quests` lists history and shows outdated assignments paused. Completing a now-ineligible quest returns 409; request another suggestion or skip it. `POST /v1/me/quests/{id}/complete` grants **10 XP once per assigned quest**, including simultaneous retries. `POST /v1/me/quests/{id}/skip` changes no XP. `GET /v1/me/pet` returns XP, level (`1 + XP // 50`) and a cosmetic milestone. Rewards survive restart and never change climbing measurements. Completion is self-reported, not evidence that an exercise occurred; game progression is not an abuse-resistant competitive leaderboard.

## Private hand photos and pose inference

`POST /v1/me/photos` accepts multipart `file`, `side=left|right`, `view=palm|back`, `upload_consent=true` and `retain_consent=true`. Retained photos are private SQLite blobs. Images are limited to 8 MiB and 16 million pixels, decoded as JPEG/PNG/WebP, oriented and normalized to JPEG without EXIF metadata. List metadata with `GET /v1/me/photos`; read/delete through `/v1/me/photos/{id}`. Deleting a photo clears its observation links while preserving symptom history.

For image inference:

```sh
.venv/bin/python -m pip install -c constraints.txt -e '.[test,pose]'
```

Obtain a model from the [official MediaPipe Python guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python), store it outside version control and set `POSE_MODEL_PATH` to its path before starting the server. `POST /v1/pose/image` accepts multipart `file` and `upload_consent=true`; it processes transient bytes and returns a result without saving an assessment or photo. Runtime/model failure returns 503; invalid image 400; excessive size 413. A native runtime abort cannot be caught as a Python exception: run MediaPipe on a supported host. The real model smoke check succeeded outside this macOS sandbox; inside it, Metal initialization aborted the process.

`POST /v1/pose/landmarks` accepts up to 33 normalized MediaPipe-style landmarks with explicit `x`, `y`, `visibility` (optional `z`). Supply `image_width` and `image_height` together for aspect-correct geometry. If omitted, the result uses normalized-square coordinates. The returned leg-spread angle uses hip midpoint and ankles in the image plane; it is not a 3D flexibility measurement. Missing/low-confidence/degenerate captures return `status=invalid_capture`, null value and a reason. To retain a good result, the client must obtain confirmation and separately post the supported assessment fields.

## Recorded video and live camera

Install `.[test,video]` with the same constraints to enable PyAV and MediaPipe VIDEO mode. The base runtime includes `websockets` so Uvicorn can serve streaming connections. `POSE_MODEL_PATH` configures both image and video inference.

`POST /v1/pose/video` accepts multipart `file` and `upload_consent=true`. Supported byte containers are modern MP4/MOV (`ftyp`) and WebM, not manifests, playlists, URLs or elementary H.264. External media references are disabled. Clips are limited to 32 MiB, 60 seconds, 1,800 decoded frames and 16 million pixels per raw frame. Phone-resolution frames are rotated using their display metadata and reduced without changing aspect ratio to fit 1280×720. Frames are sampled approximately every 200 ms through one VIDEO-mode detector. Missing/nonfinite presentation timestamps are rejected rather than invented. Temporary files are removed on success and failure.

The response contains `duration_ms`, `sampled_frame_count`, `valid_frame_count` and `frames`, each with `timestamp_ms` and the existing pose result fields. Counts describe visibility/geometry acceptance, not scientifically validated measurements. No assessment is saved automatically.

`WS /v1/pose/stream` uses this sequential protocol:

```json
{"type":"start","token":"your privately stored token","upload_consent":true}
```

After the server's `ready` message, send `{"type":"frame","timestamp_ms":0}` followed by binary JPEG bytes. Wait for the matching `result` before sending another pair. Timestamps must strictly increase. Send `{"type":"stop"}` to finish. The start message also accepts `"metric":"shoulder_reach"`; omitting `metric` selects `leg_spread`. Unknown selectors are rejected before creating a detector. Each result preserves the submitted `timestamp_ms`, retains the scalar pose fields, and includes normalized `landmarks` (`x`, `y`, `visibility`) plus the analyzed frame's `image_width`/`image_height` for aligning the preview overlay. Invalid captures return null values and an empty landmark list to clear the overlay.

Shoulder reach uses `front-facing-overhead-reach-v1`: the projected hip→shoulder→elbow angle per side, with visible hips, shoulders, elbows and wrists. Both elbow angles must be at least 160° as an engineering straight-arm heuristic. The response includes `left_value`, `right_value`, and scalar `value` as their mean; invalid captures have all three null. Angles use the frame's aspect ratio and are not 3D mobility or force measurements. Uploading a live result never saves an assessment automatically; the client reviews and separately saves each shoulder side.

Credentials belong in the first message, never in the URL. Identity is checked again before each frame, so deletion revokes an existing stream.

Each live session owns one detector, limits JPEGs to 8 MiB/16 million pixels, applies EXIF orientation and downsamples to 1280×720. It has a 60-second lifetime, 1,800-frame cap, 1 KiB control messages and 10-second message timeouts. Processing runs in worker threads; disconnects and errors close the detector. There is no frame retention. The client samples with backpressure rather than attempting to send every native camera frame.

## Verification and scope

The [TDD record](../docs/backend-tdd.md) and the [scenario plan](../docs/superpowers/plans/2026-10-03-backend.md) list the behaviors. Tests exercise real SQLite, HTTP validation, identity isolation, restart persistence, historical heatmaps, image retention/deletion, stale quest handling and concurrent completion. Optional inference tests replace the expensive native detector boundary while retaining image decoding; a separate real-model smoke check verifies integration without bundling model assets.

The app's live assessment and hand-journal screens use these APIs, with local previews, review before saving, and upload and retention permissions chosen in setup or Settings. Real provider OAuth/imports, clinical symptom routing, broad form coaching, calibrated grade/style scoring and personalized stretching prescriptions remain subsequent work. This backend does not infer injury type or a healing date from a photo.
