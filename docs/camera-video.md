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

The home screen has **Camera assessment** and **Hand journal** entry points. Browser recordings stop at 30 seconds. Review playback is embedded; retake/discard releases the object URL. Backgrounding or leaving the route closes capture and streaming resources. Brief permission-dialog inactivity preserves local preview startup while stopping live server inference.

## Native adapters

Native previews use `react-native-camera-kit@17.0.0`, paired with `@react-native-ohos/react-native-camera-kit@17.0.0-beta.4` for RNOH 0.84. Android/iOS camera permissions use `react-native-permissions@5.4.4`; their adapters support live preview, snapshots and binary frame transfer. Their adapter does not expose recorded-video capture yet; the UI shows that availability state. Snapshot files there remain under OS-managed temporary storage.

HarmonyOS additionally has a small `ClimbingCameraMedia` UI TurboModule for system-camera video capture and private-cache byte reads/releases. It limits system recordings to 30 seconds and 32 MiB. The system camera supplies its own clip review; the app then offers explicit analysis. Private JPEG frames and MP4 clips have narrowly scoped, idempotent deletion callbacks. Arbitrary paths and traversal are rejected. During an intentional system-camera handoff, the native helper hides its preview while the parent preserves the pending capture; late media after actual disposal is discarded.

The Harmony camera-kit patch uses JPEG image buffers and private cache instead of saving every sampled frame into the public gallery. It emits a startup event so capture controls wait for an initialized camera. A paired upstream patch enables React Native's supported interop for its legacy native module on Android/iOS. `patch-package` applies these changes during mobile install; do not manually overwrite patched node_modules.

For native builds, run mobile dependency installation, re-sync Harmony dependencies in DevEco (`ohpm install`), and rebuild the native app. The added local camera dependency requires regenerating the Harmony package-manager lock during that sync; this environment cannot run the missing toolchain. Android needs a rebuilt app; iOS needs CocoaPods installation and a rebuilt app. Metro-only refresh cannot install new native modules.

The native app's default backend is localhost. Device/emulator networking must route that address to the development server; Harmony commonly uses `hdc rport tcp:8000 tcp:8000`, Android `adb reverse tcp:8000 tcp:8000`. A production host/configuration and durable native credential storage require separate setup; the existing native storage adapter is still in-memory.

## Verification and limits

- Browser end-to-end smoke used a fake camera backed by an official public MediaPipe sample, not a real camera or personal media. Local preview, snapshot consent/analysis, recorded-video review/analysis, sampled live results and private journal saving passed against the real backend. The test profile was deleted afterwards.
- Real model tests covered MP4, 1080p H.264 MOV and sequential WebSocket frames. Rotation/downsampling and container restrictions have encoded-media fixtures.
- Tests cover permission denial, late initialization, stale captures, cancellation, backpressure, revocation, missing timestamps and scoped media cleanup. Backend tests use real decoding and replace only the expensive inference seam.
- Harmony, Android and iOS JavaScript bundles pass. Native bridge camera/file/image APIs were checked against official OpenHarmony API 20 SDK declarations; only the RNOH context shell was stubbed.
- Physical camera operation, runtime dialogs, system recorder, signed HAP, Android native and iOS native builds remain unverified because device/toolchains are unavailable. SDK type checking and JS bundling do not establish native build success.
- MediaPipe initializes successfully outside this macOS sandbox; inside it Metal initialization can abort the native process. PyAV and MediaPipe's OpenCV dependency also emit a duplicate FFmpeg Objective-C class notice on this Mac. Functional smoke passed; production inference should run on a supported, tested host.

## Future scientific citation integration

Use the stable source IDs and claim-to-copy ledger in [climbing-scientific-evidence.md](climbing-scientific-evidence.md). Put evidence details near the result/explanation, with study population and limitations. Do not relabel a visibility threshold as measurement accuracy or apply Keith Baar laboratory schedules as universal climbing prescriptions.

Final verification: **172 backend tests** and **85 frontend/mobile tests** passed. Backend statement coverage is **99%**; Ruff, app typechecking, targeted app/platform lint, production web build and dependency checks passed. Browser fake-camera regression passed all five capture/analysis/journal flows. Independent reviews approved the backend fixes, scientific handoff and media-cleanup fixes. Core-only backend verification passed 145 tests with 27 optional-video/MediaPipe tests skipped before the WebSocket dependency was added; the full configured environment is the final integration reference.
