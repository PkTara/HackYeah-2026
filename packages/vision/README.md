# @hackyeah/vision: camera tests on the device

Counts pull-ups and times dead hangs and planks **live**, from body keypoints, while the camera runs. It also describes a **recorded climb** (straight arms, pauses, foot re-placements, fast moves). Everything here runs on the device and this package makes no network calls. Pure TypeScript: no React, no react-native, no MediaPipe import, so it bundles unchanged for Android, iOS and the web.

The server-side pose step is in `backend/`: `POST /v1/pose/image` (MediaPipe on one uploaded image) and `POST /v1/pose/landmarks` (leg-spread angle from landmarks the client sends). See `backend/README.md`.

```
camera -> KeypointSource (per platform) -> PoseFrame -> PullupCounter / HoldTimer -> live state + TestResult
recorded clip -> PoseFrame[] -> analyzeClimbForm() -> ClimbFormReport
```

## Files

| File | What it does |
|---|---|
| `pose.ts` | `PoseFrame`: named landmarks (x, y normalised to 0..1, visibility 0..1) plus a timestamp and the image size. Maps MediaPipe's 33 points and the 17 COCO points to one set of names. |
| `geometry.ts` | Angles and distances in pixels, so portrait frames do not squash angles. |
| `repCounter.ts`, `pullups.ts` | A rep state machine fed one frame at a time, and the pull-up rule. `PullupCounter` is the class screens use. |
| `holdTimer.ts`, `postures.ts` | A hold timer fed one frame at a time, and the plank and dead hang rules. |
| `result.ts` | `TestResult`, quality verdicts and capture statistics shared by all tests. |
| `sources.ts` | `KeypointSource` (where frames come from), plus replay and "unavailable" sources. |
| `mediapipe.ts` | Web source: runs an injected MediaPipe `PoseLandmarker` on each video frame. |
| `synthetic.ts` | A deterministic stick figure doing each test, and a climb. Used by tests, the harness and the labelled "simulated camera". |
| `climbForm.ts` | Descriptive observations about a recorded climb. |
| `harness/` | A standalone browser page wiring all of this to a webcam (developer tool, not app UI). |

## Using a live test

```ts
import { PullupCounter, createSimulatedSource } from '@hackyeah/vision';

const source = createSimulatedSource('pull-ups'); // or the platform's camera source
const counter = new PullupCounter({ source: source.info });
await source.start(frame => setLive(counter.push(frame))); // live: phase, reps, progress
// ... the user taps Stop
source.stop();
const result = counter.finish();
if (result.verdict === 'ok') {
  save(result.value); // whole reps
} else {
  // offer a retake or "type it in"; result.metrics still says what was seen
}
```

Dead hang and plank work the same way with `createDeadHangTimer()` and `createPlankTimer()`. Their live state has `phase` (`get_in_position`, `holding`, `wobble`, `ended`), `holdS`, `bestS` and a `hint` code such as `hips_sagging`, `arms_bent` or `hands_not_overhead`. Screens show their own words for each code. When `phase` becomes `ended` the screen can stop by itself.

Test ids are the home test ids in `@hackyeah/core` (`pull-ups`, `dead-hang`, `plank`); a unit test keeps them in sync.

### What a result contains

| Field | Meaning |
|---|---|
| `verdict` | `ok`, `low_confidence`, `person_not_found`, `too_short` or `not_in_position` |
| `value` | Reps, or whole seconds of the longest hold (like the manual stopwatch). **null unless the verdict is `ok`**, so a poor capture never becomes a saved score. |
| `metrics` | Per rep: start, top, end, ascent and descent seconds; partial reps and why. Holds: every hold with start and end. |
| `capture` | Duration, frames, frames with a person, usable share, mean visibility, fps. |
| `method` | Rule id and version, every threshold used, and the keypoint source (model and version, and `simulated`). |
| `setup` | Expected camera view and the body parts that must be in the frame. |

Verdicts are checked in this order: nobody seen, shorter than the minimum (3 s for reps, 2 s for holds), poorly visible (under 60% usable frames or mean visibility under 0.5), never in the start position.

## How each test is measured

All signals are angles or ratios of body lengths, never pixel distances. Every signal goes through a 3-frame running median before a threshold.

**Pull-ups** (front view, head, arms and shoulders in the frame)
- Start position: hands above the shoulders (on the bar) and both elbows at least 150 degrees.
- Progress: how far the shoulders have risen towards the hands, as a share of this person's own straight-arm hang (calibrated from their hanging frames).
- Top: the nose above the line of the wrists and progress at least 0.5. The wrist sits a few cm under the bar, so this is a slightly lenient stand-in for "chin over the bar".
- A rep counts when the top is reached after leaving the hang. An attempt that falls back to the hang without reaching the top, or goes back up without first reaching the hang, is a partial rep and is not counted.
- Ascent: from leaving the straight-arm hang to reaching the top. Descent: from leaving the top to being back in the hang.

**Dead hang** (front view)
- In position: wrists at least 0.6 arm lengths above the shoulders, both elbows at least 150 degrees, hips below the shoulders when visible.
- The camera cannot tell whether the feet are off the ground; the screen must ask people to lift them.

**Plank** (side view, whole body in the frame)
- In position: shoulder-to-ankle line within 35 degrees of horizontal, upper arm pointing down from the shoulder (on forearms or hands), knees at least 150 degrees, and shoulder-hip-ankle at least 160 degrees. The hint says whether the hips sag or lift.
- The side facing the camera is used; it only switches when the other side is clearly more visible.

**Holds (both)**: a hold starts after 0.5 s in position, backdated to its first frame. Breaks shorter than 1 s do not end it (the shown time pauses meanwhile). The result is the longest hold of at least 1 s.

Push-ups and one-leg balance fit the same machinery: a push-up is a `RepRule` (start: arms straight in a plank, target: elbows bent), one-leg balance is a `PostureRule` (one ankle clearly above the other). Neither is built yet.

## Climbing form from a recorded clip

`analyzeClimbForm(frames)` takes the PoseFrames of one climb from any source. It returns **candidate observations to check against the video, not grades, not coaching advice and not an injury assessment** (`CLIMB_FORM_DISCLAIMER` has a sentence a screen can show). Each observation has a value, a confidence (0 to 1) and evidence with start and end times and frame indexes.

| Observation | Definition |
|---|---|
| `straight_arms` | Share of still moments (hip speed under 0.3 torso lengths per second) with a hand above the shoulder where those arms were at least 150 degrees, with left and right separately. Evidence: bent-arm holds (under 120 degrees) of 1 s or more. |
| `pauses` | Moments of 1.5 s or more with the hips nearly still (under 0.15 torso lengths per second), plus the share of the climb spent still. |
| `hip_path` | Geometric index of entropy of the hip path, ln(2 x path length / convex hull perimeter), a fluency measure used in climbing research. Higher means a more winding path. Compare attempts on the same route only. |
| `foot_replacements` | A foot settles, moves less than 0.35 torso lengths and settles again: a re-placement on the same hold. |
| `fast_moves` | The hips moving faster than 1.4 torso lengths per second over at least 0.25 torso lengths, with direction (dynamic moves, jumps, drops). |

Assumptions: a still camera, one climber, filmed from behind or from the side; lengths in torso lengths measured from the clip. The climb is the part where the hips are clearly above where they started (otherwise the whole clip, with a reason). Clips are rejected (`low_confidence`, no observations) when the climber is in under 60% of frames, keypoints are poorly visible, or the keypoints wobble by more than 0.08 torso lengths per frame. That last check matters: a model can report high visibility for points it has put in the wrong place, and those points wobble. To build `frames` from a file, step through the video at a fixed rate by seeking (as `harness/main.ts` does), not while it plays, so a slow device analyses the same frames as a fast one.

## Keypoints per platform

| Platform | Source | State |
|---|---|---|
| Web | MediaPipe Pose Landmarker in the browser (WASM). The web host imports `@mediapipe/tasks-vision` and passes the landmarker to `createMediaPipeSource`. | Works in the harness, including real inference in headless Chromium. Not wired into app screens. |
| Android, iOS | MediaPipe Tasks Pose Landmarker for Android and iOS (the same models), in a native module that runs on camera frames and sends the 33 landmarks to JS, where `fromMediaPipeLandmarks()` turns them into PoseFrames. | Not built. Native support does not exist today: use `createUnavailableSource()` (or the labelled `createSimulatedSource()`) until it does. |
| Server | `backend/`: `/v1/pose/image` and `/v1/pose/landmarks`. | Owned by the backend. |

Until a platform has a source, `createSimulatedSource(test)` plays a synthetic session in real time. Its results carry `simulated: true` and must be labelled as simulated on screen.

Which MediaPipe model: use **full**. On a real photo of the top of a chin-up (GPU delegate, analysed from a video file), `lite` put the wrists at the waist and wobbled by up to 70 px between identical frames; `full` placed every joint within about 20 px of where it is and wobbled under 3 px; `heavy` had outlier frames. That was one image, so it is a reason to prefer full, not a validation.

Which delegate: the harness uses **CPU** by default. In headless Chromium with software WebGL, the full model found nobody on the GPU delegate from a live camera while CPU found the person at about 12 fps. Check the GPU delegate on the real target browsers before switching (`?delegate=GPU` in the harness).

## Web harness

```sh
node apps/web/node_modules/vite/bin/vite.js --config packages/vision/harness/vite.config.mjs
```

Open the printed URL. Pick a test, then **Start camera** (webcam, MediaPipe in the browser) or **Simulate** (stick figure), and **Stop and show result** to see the full `TestResult`. **Climbing clip** analyses a local video file with `analyzeClimbForm`. The WASM files come from `apps/web/node_modules/@mediapipe/tasks-vision`; the model is fetched from Google's model storage. To run offline, download it into `packages/vision/harness/models/` (gitignored) and open `?model=/models/pose_landmarker_full.task`. Typecheck the page against the real MediaPipe types with `node apps/mobile/node_modules/typescript/bin/tsc -p packages/vision/harness/tsconfig.json`.

## Privacy

- Camera frames are analysed on the device. This package uploads nothing and stores nothing.
- Results are numbers and timestamps, no images. Keypoint frames are still personal movement data: keep them only as long as a screen needs them.
- Loading the model from Google's storage tells Google the device's IP address. Self-host the `.task` file for production.
- The MediaPipe web runtime sends usage and performance metrics (not images) to `https://odml.pa.googleapis.com/v1/log`, as its privacy notice says. Disclose it, or block it with a Content-Security-Policy `connect-src` that leaves that host out: the logger stops when the request fails and inference carries on (seen in the headless runs).
- Sending anything to `backend/` (images or landmarks) is the app's decision and needs the consent flow the backend already enforces.

## External libraries and models

| What | Licence | Where it comes from |
|---|---|---|
| `@mediapipe/tasks-vision` 1.0.1 (web only) | Apache-2.0 | npm; a dependency of `apps/web` (see `apps/web/package.json`). The WASM runtime ships inside the package. |
| MediaPipe Pose Landmarker models (BlazePose GHUM 3D): `pose_landmarker_lite.task` (5.8 MB), `pose_landmarker_full.task` (9.4 MB), `pose_landmarker_heavy.task` (31 MB), float16 version 1 | Apache-2.0 (model card) | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_<variant>/float16/1/pose_landmarker_<variant>.task`, listed in `MEDIAPIPE_POSE_MODELS`. Not committed. The model card lists fitness and repetition counting as intended uses; more than one person, people over about 4 m away and a hidden head are out of scope. |
| MediaPipe Tasks for Android and iOS (planned) | Apache-2.0 | Maven (`com.google.mediapipe:tasks-vision`) and CocoaPods (`MediaPipeTasksVision`), with the same `.task` model files. Not added yet. |
| [jeremyipark/vision-demos](https://github.com/jeremyipark/vision-demos) | Apache-2.0 | Design ideas, re-written in TypeScript, not copied: the hysteresis rep counter with a median filter and head-above-hands gate (`chin_ups/src/reps.py`), angles in pixels on normalised keypoints and choosing the body side once instead of per frame (`deadlift/src/reps.py`). The files that use them say so. |
| Vite (harness only) | MIT | Already installed by `apps/web`. |

## Not validated

- Every threshold is a first guess. The tests use synthetic stick figures (on which every check passes for 40 seeds at 15 and 30 fps with jitter); the only real-person check was one photo in a browser. Nothing has been compared with a person counting or timing by hand.
- Pull-ups: the nose-above-wrists top is a proxy; kipping and swinging are not detected; it needs a front view with the head and both arms in the frame.
- Plank and dead hang: one side view and one front view respectively; poses outside those set-ups are not handled.
- Climbing form: still camera only, one climber, 2D only, ankle rather than toe. The observations are candidates.
- Live speed on phones is unknown, and the native Android and iOS sources do not exist yet.
- The headless browser check (software WebGL, a fake camera playing one photo) gave results that depend on the delegate and the input: from a video file, GPU placed the joints within about 20 px and held steady while CPU lost the person in 39 of 91 frames; from the live camera, GPU found nobody while CPU found the person in 83 of 103 frames, with looser placement. The quality gates rejected the unsteady runs. None of this shows how real browsers on real hardware behave: check both delegates there.
