/**
 * Live keypoints in the browser with MediaPipe Pose Landmarker.
 *
 * This package never imports `@mediapipe/tasks-vision`: the HarmonyOS and
 * Android bundles must not contain it, and the mobile typecheck would fail on
 * it. The web host creates the landmarker and passes it in, typed by the small
 * structural types below (a real PoseLandmarker fits them). Wiring, as the web
 * host or services/vision/web-harness does it:
 *
 *   import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
 *   const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
 *   const landmarker = await PoseLandmarker.createFromOptions(fileset, {
 *     baseOptions: { modelAssetPath: MEDIAPIPE_POSE_MODELS.lite, delegate: 'GPU' },
 *     runningMode: 'VIDEO',
 *     numPoses: 1,
 *   });
 *   const source = createMediaPipeSource({ landmarker, video: videoElement });
 *
 * Inference runs on the device. No camera frame leaves the browser.
 */
import {
  fromMediaPipeLandmarks,
  type MediaPipeLandmarkLike,
  type PoseFrame,
} from './pose';
import type {
  ErrorListener,
  FrameListener,
  KeypointSource,
  KeypointSourceInfo,
} from './sources';

/**
 * Official model files (Apache 2.0, BlazePose GHUM 3D model card). Use
 * `full` (about 9.4 MB) by default. On a real photo of the top of a chin-up,
 * `lite` (about 5.8 MB) put the wrists at the waist and wobbled by up to 70 px
 * between identical frames, while `full` placed every joint within about
 * 20 px and wobbled under 3 px. `heavy` (about 31 MB) had outlier frames in
 * the same check. That was one image, so measure on real clips before
 * trusting any of them.
 */
export const MEDIAPIPE_POSE_MODELS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  heavy:
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
} as const;

export type MediaPipePoseResultLike = Readonly<{
  landmarks: readonly (readonly MediaPipeLandmarkLike[])[];
}>;

/** The part of `PoseLandmarker` (running mode "VIDEO") this package calls. */
export type MediaPipePoseLandmarkerLike = {
  detectForVideo(
    videoFrame: unknown,
    timestampMs: number,
  ): MediaPipePoseResultLike;
};

/** The part of an HTMLVideoElement this package reads. */
export type VideoLike = Readonly<{
  videoWidth: number;
  videoHeight: number;
  /** HTMLMediaElement.readyState; 2 or more means a frame is available. */
  readyState?: number;
}>;

/** requestAnimationFrame and cancelAnimationFrame, injectable for tests. */
export type FrameScheduler = Readonly<{
  request(callback: () => void): unknown;
  cancel(handle: unknown): void;
}>;

type AnimationGlobals = {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
  performance?: { now(): number };
};

function defaultScheduler(): FrameScheduler {
  const g = globalThis as AnimationGlobals;
  if (g.requestAnimationFrame && g.cancelAnimationFrame) {
    const request = g.requestAnimationFrame.bind(globalThis);
    const cancel = g.cancelAnimationFrame.bind(globalThis);
    return { request, cancel: handle => cancel(handle as number) };
  }
  return {
    request: callback => setTimeout(callback, 16),
    cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

function defaultNow(): number {
  const g = globalThis as AnimationGlobals;
  return g.performance ? g.performance.now() : Date.now();
}

/** The first detected person in a landmarker result, as a PoseFrame. */
export function fromMediaPipeResult(
  result: MediaPipePoseResultLike,
  t: number,
  width: number,
  height: number,
): PoseFrame {
  return fromMediaPipeLandmarks(result.landmarks[0], t, width, height);
}

export type MediaPipeSourceOptions = Readonly<{
  landmarker: MediaPipePoseLandmarkerLike;
  /** A playing video, e.g. an HTMLVideoElement showing a getUserMedia stream. */
  video: VideoLike;
  /** Overrides for the reported model, e.g. { modelVersion: 'tasks-vision 1.0.1, lite float16/1' }. */
  info?: Partial<KeypointSourceInfo>;
  /** Analyse at most this many frames per second. Default 30. */
  maxFps?: number;
  scheduler?: FrameScheduler;
  /** Milliseconds, increasing. Defaults to performance.now(). */
  now?: () => number;
}>;

export function createMediaPipeSource(
  options: MediaPipeSourceOptions,
): KeypointSource {
  const scheduler = options.scheduler ?? defaultScheduler();
  const now = options.now ?? defaultNow;
  const minGapMs = 1000 / (options.maxFps ?? 30);
  let handle: unknown = null;
  let running = false;

  const stop = () => {
    running = false;
    if (handle !== null) {
      scheduler.cancel(handle);
      handle = null;
    }
  };

  return {
    info: {
      id: 'mediapipe-web',
      model: 'MediaPipe Pose Landmarker (BlazePose GHUM 3D)',
      modelVersion: 'set by the web host',
      landmarkSet: 'mediapipe-33',
      runsOn: 'device',
      simulated: false,
      ...options.info,
    },
    available: true,
    async start(onFrame: FrameListener, onError?: ErrorListener) {
      stop();
      running = true;
      let lastT = -Infinity;
      const { video, landmarker } = options;

      const tick = () => {
        if (!running) {
          return;
        }
        handle = scheduler.request(tick);
        const t = now();
        const ready = (video.readyState ?? 4) >= 2 && video.videoWidth > 0;
        // MediaPipe needs strictly increasing timestamps in VIDEO mode, so a
        // clock that has not moved means no new frame to analyse.
        if (!ready || t <= lastT || t - lastT < minGapMs) {
          return;
        }
        let frame: PoseFrame;
        try {
          const result = landmarker.detectForVideo(video, t);
          frame = fromMediaPipeResult(
            result,
            t,
            video.videoWidth,
            video.videoHeight,
          );
        } catch (error) {
          stop();
          onError?.(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        lastT = t;
        onFrame(frame);
      };
      handle = scheduler.request(tick);
    },
    stop,
  };
}
