# Live camera, video analysis and research implementation plan

The user authorized implementing video support and live camera previews with snapshots, plus a scientific citation handoff. Continue Canon TDD for executable behavior.

## Interfaces and ownership

- Backend agent: optional PyAV video decoder + MediaPipe VIDEO sessions, authenticated/consented clip API and live WebSocket, tests. Clips <=32MiB/60s with bounded decoding and sampling; live frames bounded and downsampled. No retention or automatic assessment writes.
- Parent: browser preview lifecycle/snapshot/recording, client API + session token, live sampled-frame pump with backpressure, capture screens, navigation, tests and verification.
- Native agent: react-native-camera-kit for Android and iOS, persistent native preview + snapshots, permission integration, investigate supported system video capture, tests/build verification.
- Research agent: primary-source citation document with study type/population, supported claims, limitations, proposed UI copy and stable citation IDs.

`CameraPreviewProps` and `CameraSession` are in `packages/platform/src/camera.types.ts`. The browser exposes snapshot and start/stop recording. Native exposes snapshot and supported optional recording methods. Unavailable features must have a clear state rather than pretend to work.

## Scenarios

- [x] Existing backend and frontend test baseline.
- [x] Live preview requests camera only after explicit start, reports denied permission and stops all tracks on close/unmount, including late permission results.
- [x] Snapshot reads the current video frame; image workflow lets user review, retake and separately consent before upload/retention.
- [x] Browser records silent bounded video and previews the clip before explicit analysis/upload; video frames are analyzed through one temporal detector.
- [x] Native camera shows a persistent live preview and returns usable current snapshot; native permission manifests match runtime requests.
- [x] Client anonymous bearer credentials are stored per backend; bad responses are readable; raw media isn't uploaded until consent.
- [x] Live analysis sends start+token+consent, then one timestamp+JPEG pair at a time; next frame waits for server result. Strictly increasing timestamps; cancellation closes socket and stops capture work.
- [x] Clip API requires consent/auth and returns timestamped measurements, quality counts and bounded duration; invalid/oversize input fails clearly and temp files close/delete.
- [x] WebSocket handshake/frame ordering/input limits/auth/deletion/disconnect/runtime failures are covered; expensive native work runs outside ASGI event loop.
- [x] Research supports exact wording, not universal prescriptions/grade predictions; Keith Baar engineered tissues, small biomarker trials and single-athlete cases are labeled accurately.
- [x] Independent review, actual browser fake-camera capture/recording smoke, real-model video smoke if available, bundles/types/lint/tests and citation-link verification.

## Product flow

Assessment: live camera → snapshot or video/live analysis → inspect result → user-confirmed save. Hand journal: live camera → snapshot → review/retake → confirm side/view/region and consent → retain photo and observation. Camera permission and server-upload consent are separate. Background/unmount must release capture resources. Raw live frames/clips are transient on the server.

A live camera preview is not itself live inference. The UI labels sampled server analysis and reports connection/results separately. No inference result is presented as a calibrated flexibility test or a diagnosis.
