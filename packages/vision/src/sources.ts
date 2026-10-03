/**
 * Where live keypoints come from.
 *
 * A KeypointSource turns a camera into a stream of PoseFrames. How the camera
 * is opened and shown is the platform's job, so each platform provides its
 * own source behind this one interface:
 *
 *   web       MediaPipe Pose Landmarker in the browser (see mediapipe.ts; the
 *             web host injects the landmarker, this package never imports it)
 *   android,  MediaPipe Tasks Pose Landmarker for Android and iOS, through a
 *   ios       native module that sends landmarks to JS. Not built yet: use
 *             createUnavailableSource() or createSimulatedSource() until then.
 *
 * Counters only see PoseFrames, so they behave the same with every source,
 * including the replayed and simulated ones used in tests and demos.
 */
import type { PoseFrame } from './pose';

export type KeypointSourceInfo = Readonly<{
  /** e.g. "mediapipe-web", "replay", "simulated". */
  id: string;
  /** Human-readable model name. */
  model: string;
  /** Model and runtime version, kept with every result. */
  modelVersion: string;
  landmarkSet: 'mediapipe-33' | 'coco-17' | 'shared';
  runsOn: 'device' | 'server';
  /** True for replayed or simulated frames: results must be labelled as not from a camera. */
  simulated: boolean;
}>;

export type FrameListener = (frame: PoseFrame) => void;
export type ErrorListener = (error: Error) => void;

export interface KeypointSource {
  readonly info: KeypointSourceInfo;
  /** False when this platform or build cannot produce keypoints. */
  readonly available: boolean;
  /** Why it is unavailable, for logs. Screens show their own copy. */
  readonly unavailableReason?: string;
  /** Starts delivering frames. Rejects with VisionUnavailableError when not available. */
  start(onFrame: FrameListener, onError?: ErrorListener): Promise<void>;
  /** Stops delivering frames. Safe to call more than once. */
  stop(): void;
}

export class VisionUnavailableError extends Error {
  readonly code = 'unavailable';
  constructor(message: string) {
    super(message);
    this.name = 'VisionUnavailableError';
  }
}

/** For platforms and builds without pose detection. Never throws until started. */
export function createUnavailableSource(reason: string): KeypointSource {
  return {
    info: {
      id: 'unavailable',
      model: 'none',
      modelVersion: 'none',
      landmarkSet: 'shared',
      runsOn: 'device',
      simulated: false,
    },
    available: false,
    unavailableReason: reason,
    start: async () => {
      throw new VisionUnavailableError(reason);
    },
    stop: () => {},
  };
}

/** setTimeout and clearTimeout, injectable for tests. */
export type Timers = Readonly<{
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}>;

const globalTimers: Timers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type ReplayOptions = Readonly<{
  info?: Partial<KeypointSourceInfo>;
  /** Deliver frames at their recorded pace (default) or all at once. */
  realTime?: boolean;
  timers?: Timers;
}>;

/**
 * Plays back recorded or generated frames. Useful for tests, for demos on
 * platforms without a pose model, and for re-running a counter on frames
 * captured earlier. Replayed results are marked `simulated` by default.
 */
export function createReplaySource(
  frames: readonly PoseFrame[],
  options: ReplayOptions = {},
): KeypointSource {
  const timers = options.timers ?? globalTimers;
  let pending: unknown = null;
  let running = false;

  const stop = () => {
    running = false;
    if (pending !== null) {
      timers.clearTimeout(pending);
      pending = null;
    }
  };

  return {
    info: {
      id: 'replay',
      model: 'recorded frames',
      modelVersion: 'n/a',
      landmarkSet: 'shared',
      runsOn: 'device',
      simulated: true,
      ...options.info,
    },
    available: true,
    async start(onFrame) {
      stop();
      running = true;
      if (options.realTime === false) {
        for (const frame of frames) {
          if (!running) {
            break;
          }
          onFrame(frame);
        }
        running = false;
        return;
      }
      let index = 0;
      const next = () => {
        pending = null;
        if (!running || index >= frames.length) {
          running = false;
          return;
        }
        onFrame(frames[index]);
        index += 1;
        if (index < frames.length) {
          const wait = Math.max(0, frames[index].t - frames[index - 1].t);
          pending = timers.setTimeout(next, wait);
        } else {
          running = false;
        }
      };
      next();
    },
    stop,
  };
}
