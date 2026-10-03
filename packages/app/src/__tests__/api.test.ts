import { createMemoryStore } from '@hackyeah/platform';
import { createClimbingApi, type Fetcher } from '../api';

test('anonymous credentials persist per backend and authorize later requests', async () => {
  const storage = createMemoryStore();
  const state = { identities: 0 };
  const fetcher: Fetcher = async url => {
    if (url.endsWith('/v1/climbers')) {
      state.identities += 1;
      return {
        ok: true,
        status: 201,
        json: async () => ({ token: 'private-test-token' }),
      } as Response;
    }
    throw new Error('Unexpected endpoint');
  };
  const api = createClimbingApi(storage, {
    baseUrl: 'http://backend.test',
    fetcher,
  });
  expect(await api.token()).toBe('private-test-token');
  const resumed = createClimbingApi(storage, {
    baseUrl: 'http://backend.test',
    fetcher,
  });
  expect(await resumed.token()).toBe('private-test-token');
  expect(state.identities).toBe(1);
  expect(
    await storage.getItem('climbing-monkey.token:http://backend.test'),
  ).toBe('private-test-token');
});

test('analysis requires upload consent before connecting or transmitting media', async () => {
  const state = { connected: false };
  const api = createClimbingApi(createMemoryStore(), {
    fetcher: async () => {
      state.connected = true;
      throw new Error('Unexpected network request');
    },
  });
  await expect(
    api.analyze(
      {
        kind: 'image',
        uri: 'file://capture.jpg',
        mimeType: 'image/jpeg',
        filename: 'capture.jpg',
      },
      false,
    ),
  ).rejects.toThrow('Upload consent is required');
  expect(state.connected).toBe(false);
});

test('a consented video is sent to the video API with private bearer credentials', async () => {
  const storage = createMemoryStore();
  await storage.setItem(
    'climbing-monkey.token:http://backend.test',
    'private-test-token',
  );
  const result = {
    frames: [],
    duration_ms: 1000,
    sampled_frame_count: 0,
    valid_frame_count: 0,
  };
  const api = createClimbingApi(storage, {
    baseUrl: 'http://backend.test',
    fetcher: async (url, init) => {
      if (
        url !== 'http://backend.test/v1/pose/video' ||
        (init?.headers as Record<string, string>).Authorization !==
          'Bearer private-test-token'
      ) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Unauthorized' }),
        } as Response;
      }
      return { ok: true, status: 200, json: async () => result } as Response;
    },
  });
  expect(
    await api.analyze(
      {
        kind: 'video',
        uri: 'file://capture.webm',
        mimeType: 'video/webm',
        filename: 'capture.webm',
      },
      true,
    ),
  ).toEqual(result);
});

test('confirmed hand capture retains a photo and links it to the user observation', async () => {
  const storage = createMemoryStore();
  await storage.setItem(
    'climbing-monkey.token:http://backend.test',
    'private-test-token',
  );
  let observation: { photo_id?: string } = {};
  const api = createClimbingApi(storage, {
    baseUrl: 'http://backend.test',
    fetcher: async (url, init) => {
      if (url.endsWith('/photos')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: 'photo-1' }),
        } as Response;
      }
      if (url.endsWith('/hands')) {
        observation = JSON.parse(init!.body as string);
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: 'hand-1' }),
        } as Response;
      }
      throw new Error('Unexpected endpoint');
    },
  });
  const saved = await api.saveHand(
    {
      kind: 'image',
      uri: 'file://hand.jpg',
      mimeType: 'image/jpeg',
      filename: 'hand.jpg',
    },
    { side: 'left', view: 'palm', region: 'ring_finger', pain: 2, note: '' },
    true,
  );
  expect(saved.id).toBe('hand-1');
  expect(observation).toEqual({
    side: 'left',
    region: 'ring_finger',
    pain: 2,
    note: '',
    photo_id: 'photo-1',
  });
});

test('confirmed assessment saves the measured fields without transport metadata', async () => {
  const storage = createMemoryStore();
  await storage.setItem(
    'climbing-monkey.token:http://backend.test',
    'private-test-token',
  );
  let assessment: object | null = null;
  const api = createClimbingApi(storage, {
    baseUrl: 'http://backend.test',
    fetcher: async (_url, init) => {
      assessment = JSON.parse(init!.body as string);
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: 'assessment-1' }),
      } as Response;
    },
  });
  const measured = {
    status: 'ok' as const,
    value: 90,
    metric: 'leg_spread',
    unit: 'degrees',
    confidence: 0.9,
    method: 'camera' as const,
    protocol: 'front-facing-leg-spread-v1',
    reason: null,
  };
  expect((await api.saveAssessment(measured, true)).id).toBe('assessment-1');
  expect(assessment).toEqual({
    metric: 'leg_spread',
    value: 90,
    unit: 'degrees',
    confidence: 0.9,
    method: 'camera',
    protocol: 'front-facing-leg-spread-v1',
  });
});

test('a failed hand observation removes its newly retained photo', async () => {
  const storage = createMemoryStore();
  await storage.setItem(
    'climbing-monkey.token:http://backend.test',
    'private-test-token',
  );
  const state = { retained: false };
  const api = createClimbingApi(storage, {
    baseUrl: 'http://backend.test',
    fetcher: async (url, init) => {
      if (url.endsWith('/photos')) {
        state.retained = true;
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: 'photo-1' }),
        } as Response;
      }
      if (url.endsWith('/photos/photo-1') && init?.method === 'DELETE') {
        state.retained = false;
        return { ok: true, status: 204 } as Response;
      }
      return {
        ok: false,
        status: 422,
        json: async () => ({ detail: 'Journal could not be saved' }),
      } as Response;
    },
  });
  await expect(
    api.saveHand(
      {
        kind: 'image',
        uri: 'file://hand.jpg',
        filename: 'hand.jpg',
        mimeType: 'image/jpeg',
      },
      { side: 'left', view: 'palm', region: 'ring_finger', pain: 2, note: '' },
      true,
    ),
  ).rejects.toThrow('Journal could not be saved');
  expect(state.retained).toBe(false);
});
