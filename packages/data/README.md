# @hackyeah/data: where the app's data lives

The screens never fetch anything. They call `useGame()` (in `packages/app/src/state/GameProvider.tsx`), which updates the screen straight away and then hands the change to a **`ClimbingBackend`**. Swapping the backend changes where data is stored without touching a single screen.

```
screens -> useGame() -> ClimbingBackend -> on-device storage (createLocalBackend)
                                        -> the FastAPI server in backend/ (createHttpBackend)
```

## The contract

`src/backend.ts` defines the interface. Both backends follow it:

| Method | When the app calls it |
|---|---|
| `load()` | On start, and after a failed save to get back in step |
| `addClimb(log)` / `removeClimb(id)` | Log screen |
| `completeQuest(id)` / `skipQuest(id)` | Quest card on the profile |
| `setHandFlag(flag, flagged)` | Hands screen and the finger close-up |
| `saveReach(reach)` | Body & reach on the Data tab |
| `saveAssessment(record)` | A reviewed live camera result (leg spread, or one record per shoulder side) and a finger strength reading |
| `finishOnboarding(result)` / `skipOnboarding()` | First-run setup |
| `saveBaseline(result)` | One home test redone from the Data tab |
| `resetProfile()` | Profile screen, after "Are you sure?". Deletes everything and starts again from setup, without the example data. Over HTTP: `DELETE /v1/me` (a 401 or 404 counts as already gone), then the token and device data are forgotten and the load it answers with makes a new climber |
| `resetDemo()` (optional) | Data tab, on-device store only and outside demo mode |

A backend that picks quests itself may answer any write with the new state. The app shows it once no other change is still saving. The on-device backend answers nothing and picks quests from the library in `packages/core`.

In demo mode the app swaps the backend: an on-device backend seeded with the sample profile in a separate store, or, with **Sample profile** unticked, the configured server under a separate demo identity (an empty on-device profile without a server; see `packages/app/src/App.tsx` and [the demo guide](../../docs/demo-mode.md)).

## Sport modes (running and swimming)

Runs and swims, sore-spot flags and the gazelle's and dolphin's quest progress go through a separate `SportBackend` (`src/sports.ts`), used by `useSport()` in `packages/app/src/state/SportProvider.tsx`. Every method takes the sport (`'run'` or `'swim'`), and each sport is saved under its own key (`climbing-monkey/sport/<sport>/v1`). It also saves which pet the app shows (`climbing-monkey/mode/v1`). There is only an on-device version for now (`createLocalSportBackend`): the FastAPI server does not know these sports yet, so they stay on the device even when `VITE_MONKEY_API_URL` is set.

## Running the app against the server

1. Start the server with the web app's address allowed: `MONKEY_CORS_ORIGINS=http://localhost:5173 npm run backend:start` (set up once with `npm run backend:setup`; see `backend/README.md`).
2. Start the web app pointed at it: `VITE_MONKEY_API_URL=http://127.0.0.1:8000 npm run web`. Without the variable the web app keeps everything in the browser, as before.
3. Native builds read `API_BASE_URL` in `src/config.ts` (null means on the device). An Android emulator or phone cannot reach the computer's 127.0.0.1 by itself: run `adb reverse tcp:8000 tcp:8000`, or use the computer's network address with the server listening on it (`--host 0.0.0.0`). The iOS simulator can use 127.0.0.1. Not tried on a device yet.

`createBackend(storage, { apiBaseUrl })` returns the HTTP backend when a URL is set, else the on-device one.

## What the HTTP backend does

Routes are in `src/endpoints.ts`, JSON shapes and their mapping in `src/wire.ts`, the requests in `src/http.ts`, and what stays on the device in `src/device.ts`. The server owns quests, XP and its rules; the client only translates.

**Identity.** On first use the backend makes an anonymous climber (`POST /v1/climbers`, name "Climber", goal "general") and keeps its token in the platform store under `climbing-monkey/api-token/v1`. Every other request sends `Authorization: Bearer <token>`. If the server answers 401 (it no longer knows the token, for example after its database was reset), the backend forgets the token, makes one new climber for all requests waiting, and retries each request once. There is no login: losing the token loses the server profile.

**Loading.** `load()` asks for five things at once: `GET /v1/me/climbs`, `/hands`, `/assessments`, `/quests` and `POST /v1/me/quests` (the current quest; the server answers with the same one while it still fits). It then builds the state:

| App state | From the server |
|---|---|
| `logs` | Climbs. `movements` (or `[movement]` for older records), `holds` (or none), `completed` as `sent`, the local date of `occurred_at` as `date` |
| `flags` | Hand reports, latest per side and finger. A flag while `pain` is null or above 0. Dated by the first report of the current run of sore reports, so editing the spots keeps the date. Spots from the latest report. Palm, back and wrist are left out for now |
| `completed`, `skipped` | Ids of quests with that status |
| `reach` | The latest `height` and `arm_span`, null until both exist |
| `assessments` | Every assessment record (camera, finger force, manual), with its side, setup and `simulated` flag |
| `assigned` | The current quest: `recovery_checkin` shows as a check-in, `reflect_climb` as plan, `record_assessment` as assess. Task from `instructions`, why from `reason`, minutes from `estimated_minutes` |
| `onboarding`, `onboardingSkipped`, `baseline` | The device store, `climbing-monkey/device/v1` |

**Saving.**

| App call | Requests |
|---|---|
| `addClimb` | `POST /v1/me/climbs` with `movement` (the first style), `movements`, `holds`, `completed`, `grade`, `grade_system: "V"` and `occurred_at` at noon UTC on the log's date. The server makes its own id; the backend remembers which server id each new climb got. Sending the same log again adds nothing |
| `removeClimb` | `DELETE /v1/me/climbs/:serverId`, after any add still on its way. A 404 counts as already gone |
| `setHandFlag` | `POST /v1/me/hands` for the finger's region: `pain: null` plus the spots to flag, `pain: 0` to clear |
| `saveReach` | Two manual assessments, `height` and `arm_span` in cm, protocol `self-measured-v1` |
| `saveAssessment` | `POST /v1/me/assessments` with the record's metric, value, unit, method, protocol and `occurred_at`, plus `confidence`, `model_version`, `side`, `setup` and `simulated` when set. Sending the same record again adds nothing |
| `completeQuest`, `skipQuest` | `POST /v1/me/quests/:id/complete` or `/skip` |
| `finishOnboarding` | Saves the answers on the device, `PATCH /v1/me` with the goal, then manual assessments for height and arm span (`self-measured-v1`), dead hang (`hang_duration`, seconds) and pull-ups (`pullups`, repetitions), protocol `<testId>-v1` |
| `skipOnboarding` | Device only |
| `saveBaseline` | Device (latest result per test), plus an assessment for dead hang and pull-ups |

Setup goals map to the server's four: harder grades and more styles to `technique`, stay injury free to `mobility`, stronger fingers to `endurance`, climb more to `general` (`SERVER_GOAL` in `wire.ts`).

Writes go out one at a time in the order they were made, so a quick add then delete reaches the server in that order, and `load()` waits for writes already made. Every write that reaches the server ends by reading the state back, so the server's quest is re-read after every change (flagging a finger switches it to a check-in straight away). That costs one write plus the five load requests per change. If only the read back fails, the change is saved anyway and the app keeps what it shows.

A 409 on a quest is not an error for the climber: the backend answers with the fresh state, which shows the quest that fits now. With the read back after every change this only happens when the quest changed on another device between loading and tapping Done.

## What stays on the device or is not stored yet

- Setup answers the server has no place for: places, experience, usual grade and app connection choices. The anonymous profile belongs to the device anyway.
- Four of the six home tests (sit and reach, plank, one-leg balance, push-ups). Of the home tests, the server has metrics only for dead hang and pull-ups. Every result is kept on the device.
- Palm, back and wrist reports are stored on the server but not shown as flags; the app only flags fingers.
- `attempts`, `location` and notes: the app does not ask, so climbs are sent without them.
- XP and level come from the completed quest ids: 10 XP per quest and a level per 50 XP, the same rule as the server's pet. The server's cosmetic is not used.
- No offline queue: a change made without signal is rolled back, not retried later. The map from app ids to server ids lives in memory.

## Camera media

The camera screens (live assessments on the Data tab, hand photos on the Hands tab and the finger close-up) send frames and photos through a `MediaClient` from `src/media.ts`, not `ClimbingBackend`: photos and frames are not game state. The app receives it like the backend: `<App media={...}>`, then `useMedia()` in the screens. `createMedia(storage, { apiBaseUrl })` makes one for the same server address as `createBackend`, or null without one; the camera screens then say they need the server. In demo mode `packages/app/src/demo/media.ts` wraps it and simulates whatever the demo switches say.

A reviewed live result is saved with `useGame().saveAssessment`, like any other assessment. The screens call `startLive` and `saveHandPhoto`; `analyze` and the media client's own `saveAssessment` (single photos and recorded clips) are not used by any screen at the moment.

| Call | Requests |
|---|---|
| `analyze(capture, consent)` | `POST /v1/pose/image` or `/v1/pose/video`, multipart with `upload_consent=true`. The server keeps nothing. Answers one reading: the latest valid sample, the latest sample (for its reason) and the usable and total counts |
| `saveAssessment(result, confirmed)` | `POST /v1/me/assessments` with `method: "camera"`, its confidence and protocol, only for a valid result the climber confirmed |
| `saveHandPhoto(capture, entry, consent)` | `POST /v1/me/photos` with `retain_consent=true`, side and view, then `POST /v1/me/hands` with `photo_id`. If the entry is refused, the photo is deleted again |
| `startLive(camera, consent, handlers, { metric })` | The `/v1/pose/stream` WebSocket (`src/live.ts`) for `leg_spread` (the default) or `shoulder_reach`: the token in the first message, one frame at a time, the next only after the answer to the last |

Every call refuses before touching the network when consent is false. Routes are in `endpoints.ts` and the JSON in `wire.ts`, like the rest.

**Identity.** The same anonymous climber as the HTTP backend: the token is read from `climbing-monkey/api-token/v1` on every request, so it follows the backend, also after a profile reset. The media client never makes a climber (the backend does that when the app loads). After a 401 it tries once more if the store holds a newer token; otherwise the climber is asked to reload the app.

**Errors** are written for the climber: no answer names the server, a 503 says the server has no pose model (`POSE_MODEL_PATH`), and 400 or 413 answers show the server's reason (for example "Video duration exceeds 60 seconds.").

## Tests

All in `src/__tests__/`:
- `http.test.ts` runs the HTTP backend against `src/testing/fakeApi.ts`, an in-memory stand-in for the server's routes with its JSON shapes and status codes but none of its rules: identity, token reuse, 401 recovery, climbs, hand reports to flags, reach, quests (assign, complete, skip, 409), setup and home tests, and the read back after each change.
- `assessments.test.ts` covers saving and reading assessment records on both backends.
- `local.test.ts` covers the on-device backend, `sports.test.ts` the sport backend.
- `media.test.ts` and `live.test.ts` cover the camera calls: consent before any request, the shared token and its 401 retry, the photo removed again after a refused entry, error messages, and live frames waiting for each answer.
