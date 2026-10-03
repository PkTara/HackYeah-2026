# Camera and video implementation

Implemented on `codex/climbing-monkey-backend`. This guide distinguishes local preview, sampled live inference, recorded clips and snapshots. Scientific copy and future citation integration: [evidence dossier](climbing-scientific-evidence.md).

## User flows

- **Camera assessment:** Start camera → local live preview → snapshot, record a clip or opt into sampled live analysis → inspect the result → separately confirm a valid measurement before saving.
- **Hand journal:** Start camera → local live preview → snapshot → review/retake → confirm hand/view/region and symptoms → consent to upload and retention → save private photo and observation.

Starting a preview requests camera permission but does not transmit frames. A snapshot remains local until upload consent. Live analysis sends sampled JPEG frames, approximately two per second when latency permits, with only one frame awaiting acknowledgement. It is not a native 60 fps frame-buffer pipeline. Clip analysis uses temporal tracking through one MediaPipe VIDEO detector, rather than reloading an image detector for every frame.

Server image/video/live processing is transient. Retaining a journal photo is a separate action with separate consent. Uploading analysis media does not automatically create an assessment. The measurement is a projected camera angle, not a validated flexibility, strength or grade test. The UI rounds the display rather than implying false precision; underlying observations retain their computational value and provenance.

## Run the browser experience

From `backend/`:

```sh
.venv/bin/python -m pip install -c constraints.txt -e '.[test,video]'
```

Set `POSE_MODEL_PATH` to a local Pose Landmarker `.task` model from the [official Python guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python). From the repository root, in separate terminals:

```sh
MONKEY_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 npm run backend:start
npm run web
```

Camera capture requires HTTPS or localhost in browsers. No microphone is requested by the browser flow. Optional `CLIMBING_MONKEY_API_URL` at Vite startup changes the default `http://127.0.0.1:8000`. Anonymous credentials are stored through the platform storage adapter, scoped to that backend.

The capture screens are the `Assessment` and `HandCapture` routes; on the web, `#Assessment` and `#HandCapture` open them. Browser recordings stop at 30 seconds. Review playback is embedded; retake/discard releases the object URL. Backgrounding or leaving the route closes capture and streaming resources. Brief permission-dialog inactivity preserves local preview startup while stopping live server inference.

## Native adapters

Android and iOS previews use `react-native-camera-kit@17.0.0`, and camera permission uses `react-native-permissions@5.4.4`. The adapter supports live preview, snapshots and binary frame transfer for live analysis. It does not record video yet; the screen says so instead of offering a recording that cannot work. Snapshot files stay in OS-managed temporary storage.

A small patch, `apps/mobile/patches/react-native-camera-kit+17.0.0.patch`, makes camera-kit copy its props instead of writing to them, because React freezes props in development. `patch-package` applies it during the mobile install; do not edit the patched files in `node_modules` by hand.

For native builds, install the mobile dependencies and rebuild the app. Android needs a rebuilt app; iOS needs CocoaPods installation (the Podfile sets up the react-native-permissions camera handler) and a rebuilt app. A Metro refresh cannot install new native modules.

The native app's default backend is localhost. Device/emulator networking must route that address to the development server; on Android run `adb reverse tcp:8000 tcp:8000`. A production host/configuration and durable native credential storage require separate setup; the existing native storage adapter is still in-memory.

## Verification and limits

- Browser end-to-end smoke used a fake camera backed by an official public MediaPipe sample, not a real camera or personal media. Local preview, snapshot consent/analysis, recorded-video review/analysis, sampled live results and private journal saving passed against the real backend. The test profile was deleted afterwards.
- Real model tests covered MP4, 1080p H.264 MOV and sequential WebSocket frames. Rotation/downsampling and container restrictions have encoded-media fixtures.
- Tests cover permission denial, late initialization, stale captures, cancellation, backpressure, revocation, missing timestamps and scoped media cleanup. Backend tests use real decoding and replace only the expensive inference seam.
- Android and iOS JavaScript bundles pass.
- Physical camera operation, runtime permission dialogs, and Android and iOS native builds remain unverified because devices and toolchains are unavailable. JS bundling does not establish native build success.
- MediaPipe initializes successfully outside this macOS sandbox; inside it Metal initialization can abort the native process. PyAV and MediaPipe's OpenCV dependency also emit a duplicate FFmpeg Objective-C class notice on this Mac. Functional smoke passed; production inference should run on a supported, tested host.

## Future scientific citation integration

Use the stable source IDs and claim-to-copy ledger in [climbing-scientific-evidence.md](climbing-scientific-evidence.md). Put evidence details near the result/explanation, with study population and limitations. Do not relabel a visibility threshold as measurement accuracy or apply Keith Baar laboratory schedules as universal climbing prescriptions.

Final verification on the backend branch, before the merge: **172 backend tests** and **85 frontend/mobile tests** passed. Backend statement coverage is **99%**; Ruff, app typechecking, targeted app/platform lint, production web build and dependency checks passed. Browser fake-camera regression passed all five capture/analysis/journal flows. Independent reviews approved the backend fixes, scientific handoff and media-cleanup fixes. Core-only backend verification passed 145 tests with 27 optional-video/MediaPipe tests skipped before the WebSocket dependency was added; the full configured environment is the final integration reference.
