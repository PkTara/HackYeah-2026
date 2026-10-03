# Climbing Monkey backend

FastAPI service for the profile → eligible quest → monkey XP loop. Python **3.12** is the tested setup (3.13 is permitted; 3.14 is excluded). SQLite, Pydantic and pytest keep the service small and independently testable. See [backend design](../docs/backend-design.md) and the [scenario plan](../docs/superpowers/plans/2026-10-03-backend.md).

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

The project `.venv` is already configured in this checkout. Root shortcuts: `npm run backend:test`, `npm run backend:check` and `npm run backend:start`.

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
{"terrain":"vertical","movement":"dynamic","completed":false,"attempts":3,"grade":"6A","grade_system":"font","location":"My gym"}
```

Post to `/v1/me/climbs`. Each first-version climb log records one terrain and one movement category. A route with mixed movement can be described through separate observations; avoid interpreting tags as mutually exclusive physical abilities.

```json
{"metric":"leg_spread","value":90,"unit":"degrees","method":"manual","protocol":"front-facing-leg-spread-v1"}
```

Post to `/v1/me/assessments`. Supported metrics: `leg_spread/degrees`, `height/cm`, `arm_span/cm`, `pullups/repetitions`, `hang_duration/seconds`. Camera assessments currently support only leg spread and require explicit confidence ≥0.7. A persisted camera result is a **user-confirmed report**, not proof the server measured it; never treat client-supplied confidence as independent verification. Optional `model_version` records provenance.

```json
{"side":"right","region":"ring_finger","pain":4,"note":"Observed after my session"}
```

Post to `/v1/me/hands`; add `photo_id` to link an owned photo of the same hand. `GET /v1/me/hands/heatmap` returns the latest rating per side/region, with null for unknown and zero for explicitly reported no discomfort. `?at=2026-10-03T10:00:00Z` requests a historical snapshot.

```json
{"kind":"bouldering","duration_minutes":45,"source":"manual"}
```

Post to `/v1/me/activities`. There is no claimed live Strava/health connection. Each evidence body accepts an optional timezone-aware `occurred_at`; otherwise the server assigns current UTC. Lists sort by actual instant. Unknown fields, inconsistent units, invalid ranges and nonfinite values return 422.

Each evidence collection supports `GET` and `DELETE /v1/me/{collection}/{id}`. `GET /v1/me/export` exports your profile, records, photo metadata, quests and pet. Fetch retained image bytes through each private photo route. `DELETE /v1/me` deletes the identity and cascades all records, photos and quests, invalidating its token. This is logical database deletion; forensic secure erasure and backup deletion require a production retention policy.

## Profile, quests and pet

`GET /v1/me/profile` returns:

- Independent `terrain`, `movement` and `grid` summaries: counts, observed completion rate and evidence IDs. `ability_score` remains null.
- `radar` axes with null values until there are validated technique observations. Do not render null as zero.
- `assessment_trends` with latest result, comparable previous result and delta; comparisons require matching metric, unit, method and protocol.
- `active_hand_flags` from the latest report per side/region, `activity_context`, and an evidence-linked `focus`.

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

## Verification and scope

The scenario plan records the TDD behaviors. Tests exercise real SQLite, HTTP validation, identity isolation, restart persistence, historical heatmaps, image retention/deletion, stale quest handling and concurrent completion. Optional inference tests replace the expensive native detector boundary while retaining image decoding; a separate real-model smoke check verifies integration without bundling model assets.

Client UI wiring, real provider OAuth/imports, clinical symptom routing, broad form coaching, calibrated grade/style scoring and personalized stretching prescriptions remain subsequent work. This backend does not infer injury type or a healing date from a photo.
