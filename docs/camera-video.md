# Camera and video implementation

The server side was built on `codex/climbing-monkey-backend` and merged into the app; the screens use the jungle UI kit. This guide distinguishes local preview, sampled live inference, recorded clips and snapshots. Scientific copy and future citation integration: [evidence dossier](climbing-scientific-evidence.md).

## User flows

**Data** groups body/reach, mobility/movement, strength/endurance and activity/recovery. Leg spread and overhead shoulder reach are in Mobility & movement. Finger strength is an external instrument-reading form in Strength & endurance; camera footage never supplies force.

Optional permissions are offered during setup and can be revoked in Settings. Old installations without a recorded preference remain opted out. Camera analysis and retained hand photos have separate switches. No per-capture consent boxes remain in these app flows.

- **Live camera assessment:** select leg spread or shoulder reach → **Record** → live preview, skeleton markings and sampled analysis → **Stop** or automatic stable-hold completion → review → **Save result** or retry. No recorded video file is produced or uploaded by the assessment screen. Existing photo/video endpoints remain available to API clients.
- **Shoulder reach:** start with arms resting and wrists below shoulders; collect a steady baseline, raise both arms as far as comfortable, and hold. The app records projected left/right shoulder angles. A resting pose alone cannot complete the test. Manual stop is available for smaller movements.
- **Hand photo journal:** start camera → photo → review/retake → hand/view/region/pain/note → **Save to journal** using the separately stored private-photo permission. Pain above zero or unrated soreness flags a finger, zero clears it, and marked spots are retained.

Record transmits sampled JPEGs with one frame awaiting acknowledgement, approximately two per second when latency permits. Transient analysis does not retain frames or automatically save an assessment. Revocation, leaving the screen and application interruptions stop uploads; stopping during an outstanding snapshot discards/releases it rather than sending it later. The operating system's camera permission is still required for real capture.

Results preserve method, protocol, timestamp and simulation provenance. Shoulder sides are separate records. Instrument force additionally preserves side, N/kgf, instrument, grip, edge depth, arm position and effort duration. Trends compare matching conditions and provenance. Camera angles and stability thresholds are engineering estimates, not clinical range-of-motion or measurement-accuracy claims.

All pushed screens, review stages, settings, demo controls and setup submenus use breadcrumbs. Settings reached from an assessment can return to that assessment; source/demo changes stop capture and preserve navigation context.

## Run the browser experience

From `backend/`:

```sh
.venv/bin/python -m pip install -c constraints.txt -e '.[test,video]'
```

Set `POSE_MODEL_PATH` to a local Pose Landmarker `.task` model from the [official Python guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python). From the repository root, in separate terminals:

```sh
MONKEY_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 npm run backend:start
VITE_MONKEY_API_URL=http://127.0.0.1:8000 npm run web
```

Camera capture requires HTTPS or localhost in browsers. No microphone is requested by the browser flow. There is one server address for everything: `VITE_MONKEY_API_URL` on the web and `API_BASE_URL` in `packages/data/src/config.ts` natively. The same address feeds the climbing data (`createBackend`) and the camera (`createMedia`). Without a configured server, real camera processing is unavailable. Enable Demo controls for labelled simulated measurements using the same live/review/save flow.

The camera uses the same anonymous climber as the rest of the app: `packages/data/src/media.ts` reads the token the HTTP backend keeps under `climbing-monkey/api-token/v1` on every request and never makes a climber of its own. After a 401 it tries once more if the backend has saved a newer token, otherwise it asks the climber to reload the app.

The capture screens are the `Assessment` and `HandCapture` routes (plus `FingerStrength` for external force readings); on the web, `#Assessment` and `#HandCapture` open them directly. Live sessions have a 60-second server cap; valid guided holds can finish earlier. Manual Stop and retry are available. Hand-photo review releases its object URL on discard. Backgrounding or leaving the route closes capture and streaming resources. Brief permission-dialog inactivity preserves local preview startup while stopping live server inference.

## Native adapters

Android and iOS previews use `react-native-camera-kit@17.0.0`, and camera permission uses `react-native-permissions@5.4.4`. The adapter supports live preview, snapshots and binary frame transfer for live analysis. It does not record video yet; the screen says so instead of offering a recording that cannot work. Snapshot files stay in OS-managed temporary storage.

A small patch, `apps/mobile/patches/react-native-camera-kit+17.0.0.patch`, makes camera-kit copy its props instead of writing to them, because React freezes props in development. `patch-package` applies it during the mobile install; do not edit the patched files in `node_modules` by hand.

For native builds, install the mobile dependencies and rebuild the app. Android needs a rebuilt app; iOS needs CocoaPods installation (the Podfile sets up the react-native-permissions camera handler) and a rebuilt app. A Metro refresh cannot install new native modules.

Native builds use `API_BASE_URL` (null by default, so the camera screens say they need the server). An emulator or phone must reach that address; on Android run `adb reverse tcp:8000 tcp:8000` for a localhost server. A production host/configuration and durable native credential storage require separate setup; the existing native storage adapter is still in-memory.

## Verification and limits

Checked on 2026-10-04 for the live flow: the frontend and backend test suites, typecheck, lint, Ruff and the production web build passed. Browser checks exercised the grouped Data tab, the saved permission, live simulated shoulder completion, force review and save, and history. The real model and the running WebSocket server returned leg measurements and body landmarks; a shoulder pose with bent elbows was rejected with its landmarks and correction text. Valid shoulder geometry is covered with controlled fixtures; a physical webcam and a full real-person shoulder movement were not tested. Streaming did not save an assessment before the reviewed Save.

- Real model tests covered MP4, 1080p H.264 MOV and sequential WebSocket frames. Rotation, downsampling and container restrictions have encoded-media fixtures.
- Tests cover permission denial, late initialization, stale captures, cancellation, backpressure, revocation, missing timestamps and scoped media cleanup. Backend tests use real decoding and replace only the expensive inference seam.
- Android and iOS JavaScript bundles build.
- Physical camera operation, runtime permission dialogs, and Android and iOS native builds remain unverified because devices and toolchains were not available. JS bundling does not show that a native build succeeds.
- MediaPipe initializes outside the macOS sandbox used for development; inside it, Metal initialization can abort the native process. PyAV and MediaPipe's OpenCV dependency also print a duplicate FFmpeg Objective-C class notice on that Mac. Production inference should run on a supported, tested host.

Earlier, on 2026-10-03, the previous capture screens (photo and clip analysis, before the live-only assessment) were checked end to end in Chromium with a fake camera fed an official public MediaPipe sample photo, against the real backend with the official Pose Landmarker lite model and a temporary database, at 390 and 1280 px. That run covered preview with nothing sent, photo review before consent, photo analysis and confirmed save, a recorded clip, live frames over the WebSocket (token in the first message, not the URL), a hand photo saved from a finger close-up that then showed as that finger's flag, the on-device build saying it needs the server, and a server without a model explaining the 503.

## Future scientific citation integration

Use the stable source IDs and claim-to-copy ledger in [climbing-scientific-evidence.md](climbing-scientific-evidence.md). Put evidence details near the result/explanation, with study population and limitations. Do not relabel a visibility threshold as measurement accuracy or apply Keith Baar laboratory schedules as universal climbing prescriptions.
