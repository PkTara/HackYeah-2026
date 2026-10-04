import { emptyGame } from '@hackyeah/core';
import { createLocalBackend, type PoseResultDto } from '@hackyeah/data';
import { createMemoryStore } from '@hackyeah/platform';
import { createDemoMedia } from '../../demo/media';
import { demoLivePose } from '../../demo/pose';
import { advanceStability, initialStability } from '../stability';
test('simulated shoulder stream establishes rest then raises and holds with aligned metadata', async () => {
  jest.useFakeTimers();
  const storage = createMemoryStore();
  const media = createDemoMedia({
    storage,
    backend: createLocalBackend(storage, emptyGame),
    analysis: true,
    handPhotos: true,
    real: null,
    prepareReal: async () => emptyGame,
  });
  let state = initialStability('shoulder_reach');
  const results: PoseResultDto[] = [];
  const session = await media.startLive(
    { snapshot: jest.fn() },
    true,
    {
      onResult: result => {
        results.push(result);
        state = advanceStability(state, result);
      },
      onError: jest.fn(),
    },
    { metric: 'shoulder_reach' },
  );
  jest.advanceTimersByTime(5000);
  expect(results[0]).toMatchObject({
    metric: 'shoulder_reach',
    left_value: 0,
    right_value: 0,
    timestamp_ms: 0,
    image_width: 640,
    image_height: 480,
  });
  expect(results[0].landmarks![15].y).toBeGreaterThan(
    results[0].landmarks![11].y,
  );
  expect(results[results.length - 1].landmarks![15].y).toBeLessThan(
    results[results.length - 1].landmarks![11].y,
  );
  expect(state.phase).toBe('complete');
  session.stop();
  jest.useRealTimers();
});
test('simulated leg spread value matches the preview landmark geometry', () => {
  const result = demoLivePose('leg_spread', 2);
  const [a, b] = [result.landmarks![27], result.landmarks![28]];
  const u = { x: (a.x - 0.5) * 640, y: (a.y - 0.65) * 480 },
    v = { x: (b.x - 0.5) * 640, y: (b.y - 0.65) * 480 };
  const angle =
    (Math.acos(
      (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)),
    ) *
      180) /
    Math.PI;
  expect(angle).toBeCloseTo(result.value!);
});
test('a simulated camera marker prevents dispatching to real inference', async () => {
  const storage = createMemoryStore();
  const startLive = jest.fn();
  const prepareReal = jest.fn(async () => emptyGame);
  const media = createDemoMedia({
    storage,
    backend: createLocalBackend(storage, emptyGame),
    analysis: false,
    handPhotos: false,
    real: {
      server: 'real',
      startLive,
    } as unknown as import('@hackyeah/data').MediaClient,
    prepareReal,
    simulatedInput: false,
  });
  await expect(
    media.startLive(
      { simulated: true, snapshot: jest.fn() },
      true,
      { onResult: jest.fn(), onError: jest.fn() },
      { metric: 'shoulder_reach' },
    ),
  ).rejects.toThrow('Real analysis needs a real capture');
  expect(startLive).not.toHaveBeenCalled();
  expect(prepareReal).not.toHaveBeenCalled();
});
