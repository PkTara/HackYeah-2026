/**
 * One shared description of a body pose, whatever produced it.
 *
 * Sources disagree on the skeleton: MediaPipe Pose Landmarker returns 33
 * points, ViTPose (the Python service) and HarmonyOS Core Vision Kit return
 * the 17 COCO points. The 17 COCO points are a subset of MediaPipe's, so they
 * are the shared core: every counter in this package only reads those. The
 * extra MediaPipe points (heels, toes, fingers, mouth) are kept when a source
 * has them, for later use.
 */

/** The 17 COCO keypoints, in COCO order. Every source provides these. */
export const BODY_LANDMARKS = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

export type BodyLandmark = (typeof BODY_LANDMARKS)[number];

/** Points only MediaPipe has. Optional everywhere. */
export const EXTRA_LANDMARKS = [
  'mouth_left',
  'mouth_right',
  'left_pinky',
  'right_pinky',
  'left_index',
  'right_index',
  'left_thumb',
  'right_thumb',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
] as const;

export type ExtraLandmark = (typeof EXTRA_LANDMARKS)[number];
export type LandmarkName = BodyLandmark | ExtraLandmark;

/**
 * One detected point. `x` and `y` are normalised to [0, 1] by the image width
 * and height (y grows downwards). `visibility` is 0 to 1: MediaPipe's
 * visibility, or the keypoint score for COCO sources.
 */
export type Landmark = Readonly<{ x: number; y: number; visibility: number }>;

export type PoseFrame = Readonly<{
  /** Milliseconds. Must increase within one session (camera or video time). */
  t: number;
  /**
   * Size of the analysed image in pixels. Needed for angles: x and y are
   * normalised separately, so on a portrait frame one unit of y is longer
   * than one unit of x.
   */
  width: number;
  height: number;
  /** A missing name means "not detected". An empty object means no person. */
  landmarks: Readonly<Partial<Record<LandmarkName, Landmark>>>;
}>;

export function hasPerson(frame: PoseFrame): boolean {
  return Object.keys(frame.landmarks).length > 0;
}

// MediaPipe Pose Landmarker (BlazePose GHUM, 33 points)

/** MediaPipe's own names, by index. */
export const MEDIAPIPE_POSE_LANDMARKS = [
  'nose',
  'left_eye_inner',
  'left_eye',
  'left_eye_outer',
  'right_eye_inner',
  'right_eye',
  'right_eye_outer',
  'left_ear',
  'right_ear',
  'mouth_left',
  'mouth_right',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_pinky',
  'right_pinky',
  'left_index',
  'right_index',
  'left_thumb',
  'right_thumb',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
] as const;

const SHARED_NAMES: ReadonlySet<string> = new Set<string>([
  ...BODY_LANDMARKS,
  ...EXTRA_LANDMARKS,
]);

/** The shared name for a MediaPipe index, or null for the inner and outer eye points. */
export function mediaPipeLandmarkName(index: number): LandmarkName | null {
  const name = MEDIAPIPE_POSE_LANDMARKS[index];
  return name !== undefined && SHARED_NAMES.has(name)
    ? (name as LandmarkName)
    : null;
}

/** One MediaPipe NormalizedLandmark, as `@mediapipe/tasks-vision` returns it. */
export type MediaPipeLandmarkLike = Readonly<{
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}>;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Converts one person's 33 MediaPipe landmarks to a PoseFrame.
 *
 * If the runtime reports no visibility at all (missing, or every value
 * exactly 0, which some web builds have done), detected points count as
 * visible: a counter that saw "nothing visible" on every frame would fail
 * silently instead.
 */
export function fromMediaPipeLandmarks(
  points: readonly MediaPipeLandmarkLike[] | undefined,
  t: number,
  width: number,
  height: number,
): PoseFrame {
  const landmarks: Partial<Record<LandmarkName, Landmark>> = {};
  if (points && points.length > 0) {
    const reported = points.some(
      p => typeof p.visibility === 'number' && p.visibility > 0,
    );
    points.forEach((p, index) => {
      const name = mediaPipeLandmarkName(index);
      if (name === null || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        return;
      }
      const visibility =
        reported && typeof p.visibility === 'number'
          ? clamp01(p.visibility)
          : 1;
      landmarks[name] = { x: p.x, y: p.y, visibility };
    });
  }
  return { t, width, height, landmarks };
}

// COCO-17 sources (ViTPose through the Python service, HarmonyOS Core Vision Kit)

/** `[x, y, score]` with x and y normalised to [0, 1]. */
export type CocoKeypoint = readonly [number, number, number];

/**
 * Converts 17 COCO keypoints in COCO order to a PoseFrame. A point at exactly
 * (0, 0) is ViTPose's "not visible" marker, so it is left out.
 */
export function fromCoco17(
  keypoints: readonly CocoKeypoint[] | undefined,
  t: number,
  width: number,
  height: number,
): PoseFrame {
  const landmarks: Partial<Record<LandmarkName, Landmark>> = {};
  (keypoints ?? []).slice(0, BODY_LANDMARKS.length).forEach((kp, index) => {
    const [x, y, score] = kp;
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
      return;
    }
    landmarks[BODY_LANDMARKS[index]] = {
      x,
      y,
      visibility: clamp01(Number.isFinite(score) ? score : 0),
    };
  });
  return { t, width, height, landmarks };
}
