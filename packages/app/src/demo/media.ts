import { FINGERS, toLocalDate, type GameState } from '@hackyeah/core';
import {
  FINGER_REGION,
  MediaError,
  type ClimbingBackend,
  type MediaClient,
  type PoseResultDto,
} from '@hackyeah/data';
import type { KeyValueStore } from '@hackyeah/platform';
import { demoLivePose, type DemoPoseCamera } from './pose';

export const demoPose: PoseResultDto = {
  status: 'ok',
  metric: 'leg_spread',
  value: 92,
  unit: 'degrees',
  confidence: 0.94,
  reason: null,
  method: 'camera',
  protocol: 'demo-front-facing-leg-spread-v1',
};

export function createDemoMedia(options: {
  storage: KeyValueStore;
  backend: ClimbingBackend;
  analysis: boolean;
  handPhotos: boolean;
  real: MediaClient | null;
  prepareReal: () => Promise<GameState>;
  simulatedInput?: boolean;
  today?: string;
}): MediaClient {
  let writes = Promise.resolve();
  const append = (key: string, value: object) => {
    const run = writes.then(async () => {
      const json = await options.storage.getItem(key);
      const old = json ? JSON.parse(json) : [];
      await options.storage.setItem(key, JSON.stringify([...old, value]));
    });
    writes = run.catch(() => {});
    return run;
  };
  const consent = (allowed: boolean) => {
    if (!allowed) {
      throw new MediaError('Tick the consent box first.', 0);
    }
  };
  const real = async () => {
    if (!options.real) {
      throw new MediaError(
        'Real media needs a configured server. Enable the corresponding demo checkbox to simulate it.',
        0,
      );
    }
    await options.prepareReal();
    return options.real;
  };
  return {
    server: options.real?.server ?? 'Demo profile on this device',
    async analyze(capture, allowed) {
      consent(allowed);
      if (!options.analysis) {
        if (capture.uri.startsWith('demo:')) {
          throw new MediaError(
            'Real analysis needs a real capture. Untick Webcam input, or tick Analysis results.',
            0,
          );
        }
        return (await real()).analyze(capture, allowed);
      }
      const count = capture.kind === 'video' ? 12 : 1;
      return { result: demoPose, last: demoPose, valid: count, total: count };
    },
    async saveAssessment(result, confirmed) {
      if (
        !confirmed ||
        result.status !== 'ok' ||
        result.value === null ||
        !Number.isFinite(result.value) ||
        result.confidence < 0.7
      ) {
        throw new MediaError('Review and confirm a valid result first.', 0);
      }
      if (!options.analysis) {
        await (await real()).saveAssessment(result, confirmed);
      }
      await append('media/assessments', {
        ...result,
        simulated: options.analysis,
        date: new Date().toISOString(),
      });
    },
    async saveHandPhoto(capture, entry, allowed) {
      consent(allowed);
      if (capture.kind !== 'image') {
        throw new MediaError('The hand journal needs a photo.', 0);
      }
      if (!options.handPhotos) {
        if (capture.uri.startsWith('demo:')) {
          throw new MediaError(
            'Real photo storage needs a real capture. Untick Webcam input, or tick Hand-photo storage.',
            0,
          );
        }
        await (await real()).saveHandPhoto(capture, entry, allowed);
      }
      const finger = FINGERS.find(f => FINGER_REGION[f] === entry.region);
      if (finger && (options.handPhotos || options.backend.kind === 'local')) {
        await options.backend.setHandFlag(
          {
            side: entry.side,
            finger,
            spots: entry.spots,
            date: options.today ?? toLocalDate(new Date()),
          },
          entry.pain !== 0,
        );
      }
      await append('media/hands', {
        ...entry,
        simulated: options.handPhotos,
        date: new Date().toISOString(),
      });
    },
    async startLive(camera, allowed, handlers, selection) {
      consent(allowed);
      if (!options.analysis) {
        if (options.simulatedInput || camera.simulated) {
          throw new MediaError(
            'Real analysis needs a real capture. Untick Webcam input, or tick Analysis results.',
            0,
          );
        }
        return (await real()).startLive(camera, allowed, handlers, selection);
      }
      let count = 0;
      let stopped = false;
      const timer = setInterval(() => {
        if (stopped) {
          return;
        }
        const result = demoLivePose(selection?.metric ?? 'leg_spread', count++);
        (camera as DemoPoseCamera).showPose?.(result);
        handlers.onResult(result);
      }, 500);
      const stop = () => {
        if (stopped) {
          return;
        }
        stopped = true;
        clearInterval(timer);
        clearTimeout(limit);
        handlers.onStopped?.();
      };
      const limit = setTimeout(stop, 60_000);
      return { stop };
    },
  };
}
