import {
  createMediaPipeSource,
  type FrameScheduler,
  type MediaPipePoseLandmarkerLike,
} from '../mediapipe';
import { MEDIAPIPE_POSE_LANDMARKS, type PoseFrame } from '../pose';
import { PullupCounter } from '../pullups';
import {
  createReplaySource,
  createUnavailableSource,
  VisionUnavailableError,
  type Timers,
} from '../sources';
import { createSimulatedSource, syntheticPullupSession } from '../synthetic';

/** A requestAnimationFrame stand-in that runs one frame per call to tick(). */
function manualScheduler() {
  let queue: Array<() => void> = [];
  const scheduler: FrameScheduler = {
    request: callback => {
      queue.push(callback);
      return queue.length;
    },
    cancel: () => {
      queue = [];
    },
  };
  const tick = () => {
    const due = queue;
    queue = [];
    due.forEach(callback => callback());
  };
  return { scheduler, tick, pending: () => queue.length };
}

const person = MEDIAPIPE_POSE_LANDMARKS.map(() => ({
  x: 0.5,
  y: 0.5,
  z: 0,
  visibility: 0.9,
}));

describe('MediaPipe source', () => {
  it('runs the landmarker on each animation frame and emits PoseFrames', async () => {
    const { scheduler, tick } = manualScheduler();
    let now = 0;
    const calls: number[] = [];
    const landmarker: MediaPipePoseLandmarkerLike = {
      detectForVideo: (_video, timestamp) => {
        calls.push(timestamp);
        return { landmarks: calls.length === 2 ? [] : [person] };
      },
    };
    const source = createMediaPipeSource({
      landmarker,
      video: { videoWidth: 640, videoHeight: 480, readyState: 4 },
      scheduler,
      now: () => now,
      info: { modelVersion: 'tasks-vision 1.0.1, lite' },
    });
    const frames: PoseFrame[] = [];
    await source.start(frame => frames.push(frame));

    for (let i = 0; i < 3; i += 1) {
      now += 40;
      tick();
    }
    source.stop();
    tick();

    expect(source.info).toMatchObject({
      id: 'mediapipe-web',
      modelVersion: 'tasks-vision 1.0.1, lite',
      simulated: false,
    });
    expect(frames).toHaveLength(3);
    expect(frames.map(f => f.t)).toEqual([40, 80, 120]);
    expect(frames[0]).toMatchObject({ width: 640, height: 480 });
    expect(frames[0].landmarks.left_wrist).toBeDefined();
    // The second result had nobody in it.
    expect(frames[1].landmarks).toEqual({});
  });

  it('skips frames before the video is ready and above the frame rate cap', async () => {
    const { scheduler, tick } = manualScheduler();
    let now = 0;
    const video = { videoWidth: 0, videoHeight: 0, readyState: 0 };
    let calls = 0;
    const source = createMediaPipeSource({
      landmarker: {
        detectForVideo: () => {
          calls += 1;
          return { landmarks: [person] };
        },
      },
      video,
      scheduler,
      now: () => now,
      maxFps: 10,
    });
    await source.start(() => {});

    now += 200;
    tick(); // not ready yet
    expect(calls).toBe(0);

    Object.assign(video, { videoWidth: 640, videoHeight: 480, readyState: 4 });
    for (let i = 0; i < 9; i += 1) {
      now += 33;
      tick();
    }
    // About 300 ms at 10 fps.
    expect(calls).toBe(3);
  });

  it('never sends MediaPipe a timestamp that is not newer than the last one', async () => {
    const { scheduler, tick } = manualScheduler();
    const stamps: number[] = [];
    let now = 1000;
    const source = createMediaPipeSource({
      landmarker: {
        detectForVideo: (_video, timestamp) => {
          stamps.push(timestamp);
          return { landmarks: [] };
        },
      },
      video: { videoWidth: 1, videoHeight: 1 },
      scheduler,
      now: () => now,
      maxFps: Infinity,
    });
    await source.start(() => {});
    tick();
    tick(); // the clock has not moved
    now = 900; // nor has it now
    tick();
    now = 1001;
    tick();

    expect(stamps).toEqual([1000, 1001]);
  });

  it('stops and reports when the landmarker throws', async () => {
    const { scheduler, tick, pending } = manualScheduler();
    const errors: Error[] = [];
    const source = createMediaPipeSource({
      landmarker: {
        detectForVideo: () => {
          throw new Error('WebGL context lost');
        },
      },
      video: { videoWidth: 1, videoHeight: 1 },
      scheduler,
      now: () => 50,
    });
    await source.start(
      () => {},
      error => errors.push(error),
    );
    tick();

    expect(errors.map(e => e.message)).toEqual(['WebGL context lost']);
    expect(pending()).toBe(0);
  });
});

describe('replay and simulated sources', () => {
  it('replays frames at their recorded pace', async () => {
    const waits: number[] = [];
    let next: (() => void) | null = null;
    const timers: Timers = {
      setTimeout: (callback, ms) => {
        waits.push(ms);
        next = callback;
        return waits.length;
      },
      clearTimeout: () => {
        next = null;
      },
    };
    const frames: PoseFrame[] = [0, 33, 70].map(t => ({
      t,
      width: 1,
      height: 1,
      landmarks: {},
    }));
    const seen: number[] = [];
    const source = createReplaySource(frames, { timers });
    await source.start(frame => seen.push(frame.t));
    while (next) {
      const run: () => void = next;
      next = null;
      run();
    }

    expect(seen).toEqual([0, 33, 70]);
    expect(waits).toEqual([33, 37]);
    expect(source.info.simulated).toBe(true);
  });

  it('feeds a counter end to end and is labelled as simulated', async () => {
    const source = createSimulatedSource('pull-ups', { realTime: false });
    const counter = new PullupCounter({ source: source.info });
    await source.start(frame => counter.push(frame));
    const result = counter.finish();

    expect(source.info).toMatchObject({ id: 'simulated', simulated: true });
    expect(result.method.source?.simulated).toBe(true);
    // The default simulated session has 5 attempts, one of them half way.
    expect(result.value).toBe(4);
    expect(result.metrics.partialReps).toBe(1);
  });

  it('stops a real-time replay', async () => {
    let scheduled = 0;
    const source = createReplaySource(syntheticPullupSession({ reps: 1 }), {
      timers: {
        setTimeout: () => {
          scheduled += 1;
          return scheduled;
        },
        clearTimeout: () => {},
      },
    });
    const seen: number[] = [];
    await source.start(frame => seen.push(frame.t));
    source.stop();

    expect(seen).toEqual([0]);
    expect(scheduled).toBe(1);
  });
});

describe('unavailable source', () => {
  it('says why and refuses to start', async () => {
    const source = createUnavailableSource(
      'No pose model on this platform yet.',
    );

    expect(source.available).toBe(false);
    expect(source.unavailableReason).toBe(
      'No pose model on this platform yet.',
    );
    await expect(source.start(() => {})).rejects.toBeInstanceOf(
      VisionUnavailableError,
    );
    expect(() => source.stop()).not.toThrow();
  });
});
