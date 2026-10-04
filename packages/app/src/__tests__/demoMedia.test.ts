import { emptyGame } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import { createMemoryStore } from '@hackyeah/platform';
import { createDemoMedia } from '../demo/media';
import { demoPose } from '../demo/media';

it('streams simulated samples until stopped and stops exactly once', async () => {
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
  const samples: number[] = [];
  let stops = 0;
  const session = await media.startLive(
    {
      snapshot: async () => {
        throw new Error('No real capture should be needed');
      },
    },
    true,
    {
      onResult: r => samples.push(r.value!),
      onError: () => {},
      onStopped: () => {
        stops++;
      },
    },
  );
  jest.advanceTimersByTime(1500);
  expect(samples).toEqual([90, 91, 92]);
  session.stop();
  session.stop();
  jest.advanceTimersByTime(5000);
  expect(samples).toEqual([90, 91, 92]);
  expect(stops).toBe(1);
  jest.useRealTimers();
});

it('refuses unconfirmed simulated results and keeps the journal unchanged', async () => {
  const storage = createMemoryStore();
  const media = createDemoMedia({
    storage,
    backend: createLocalBackend(storage, emptyGame),
    analysis: true,
    handPhotos: true,
    real: null,
    prepareReal: async () => emptyGame,
  });
  await expect(media.saveAssessment(demoPose, false)).rejects.toThrow(
    'Review and confirm',
  );
  expect(await storage.getItem('media/assessments')).toBeNull();
});

it('rejects simulated webcam frames before trying real live analysis', async () => {
  const storage = createMemoryStore();
  const media = createDemoMedia({
    storage,
    backend: createLocalBackend(storage, emptyGame),
    analysis: false,
    handPhotos: true,
    real: null,
    prepareReal: async () => emptyGame,
    simulatedInput: true,
  });
  await expect(
    media.startLive(
      {
        snapshot: async () => ({
          kind: 'image',
          uri: 'demo:assessment/image',
          mimeType: 'image/jpeg',
          filename: 'demo.jpg',
        }),
      },
      true,
      { onResult: () => {}, onError: () => {} },
    ),
  ).rejects.toThrow('Real analysis needs a real capture');
});
