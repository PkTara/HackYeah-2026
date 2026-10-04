# Data and live assessments

Approved in chat on 2026-10-04. User additionally requires breadcrumbs for every submenu and TDD for new behavior. Existing authorization to commit and push persists.

Data replaces the visible Tests tab. Four groups: Body & reach (height, arm span, ape index); Mobility & movement (leg spread, overhead shoulder reach, sit-and-reach, balance); Strength & endurance (instrument finger force, pull-ups, push-ups, dead hang, plank); Activity & recovery (provider examples/import state and hand-journal links). Results include source and date; new camera/finger records persist in history and appear on Profile. Settings, Demo controls and About are utilities. Existing Tests deep links may remain aliases.

Optional camera-analysis permission is offered during setup and editable/revocable in Settings. Existing installs without a preference are not opted in. No per-capture analysis consent boxes. Revocation stops streaming and prevents subsequent frames, including pending snapshots. Saving a reviewed result is distinct from upload consent. Hand-photo retention remains separately selectable. No automatic permission from skipped setup or enabling demo mode.

Record starts a camera session and sampled live frame uploads, with backpressure. No MediaRecorder video upload in the assessment UI. Return landmarks and frame dimensions for an overlay aligned with preview letterboxing/crop/mirroring. Manual Stop always works; valid steady measurements can auto-stop. Bad/missing landmarks clear the overlay/readiness. Leaving the screen/backgrounding/revocation stops and releases resources. Results are reviewed before persistence. Demo sources implement the same flow with explicit simulation provenance.

Shoulder protocol: front-facing-overhead-reach-v1, angle hip→shoulder→elbow for each side, straight elbows, visible hips/shoulders/elbows/wrists. Setup establishes resting arms with wrists below shoulders from three valid steady samples spanning at least 0.8 seconds; raising either arm at least 5° from baseline starts the holding phase. At least five valid samples spanning two seconds with ≤3° variation per angle complete a hold. Missing frames or >1.5-second gaps reset hold. Resting arms alone cannot auto-complete. These are engineering heuristics, not accuracy claims. Leg spread also uses a steady valid hold, with framing instructions and explicit recording action.

Finger strength records self-reported external instrument force in N or kgf (spelled out). Preserve side, instrument, grip, edge depth, arm position and effort duration; no camera force estimation. Dead hang remains endurance. Trends require matching units, method, protocol, side, setup and simulation provenance. Future previews become actual functionality.

## Contracts

Backend stream start accepts optional metric `leg_spread|shoulder_reach`, default leg_spread. Result retains existing scalar fields and adds optional `left_value`, `right_value`, `landmarks: [{x,y,visibility}]`, `image_width`, `image_height`, `timestamp_ms`. Shoulder scalar `value` is the mean of two valid projected angles; UI displays/saves each side individually, never a force score. Invalid results have null values. Stream callback retains timestamp and selected metric. Detector/session defaults remain backwards compatible.

Persisted assessment metrics include existing metrics plus `shoulder_reach_left`, `shoulder_reach_right`, `finger_force`; unit adds N/kgf. Finger setup JSON: `{instrument: string, grip: 'open_hand'|'half_crimp'|'full_crimp', edge_mm: number, arm_position: 'straight'|'bent', effort_seconds: number}`. Finger records require setup/side and manual method. All assessments may include `simulated: boolean` (default false). Generic JSON record storage needs no SQL migration.

Core AssessmentRecord: `{id, metric, value, unit, method, protocol, occurredAt, confidence?, modelVersion?, side?, setup?, simulated?}`. Metric/unit/setup mirror API contract, with camelCase timestamps/modelVersion only; setup fields retain snake_case to preserve comparability. `GameState.assessments?: readonly AssessmentRecord[]` supports legacy literals; parsed state supplies []. `ClimbingBackend.saveAssessment(record)` and `useGame().saveAssessment(record): Promise<void>` persist/reload history. Camera UI saves leg spread or two shoulder side records through this game API.

MediaClient.startLive keeps existing three arguments and adds optional fourth `{metric?: 'leg_spread'|'shoulder_reach'}`. Existing image/video methods may remain for compatibility outside the new assessment screen.

Every pushed route has a canonical breadcrumb trail, including direct links. Demo controls' modal has a clickable breadcrumb back to its opening context. Setup provider/test submenus have breadcrumbs. All utility/settings links open screens with breadcrumbs. No standalone close/back button is the sole path back from a submenu.
