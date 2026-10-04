import { createMemoryStore, type MediaCapture } from '@hackyeah/platform';
import { createMedia } from '../config';
import { API_TOKEN_KEY } from '../device';
import { NO_POSE_MODEL, createMediaClient, type MediaFetch } from '../media';
import type { LiveSocket } from '../live';
import type { PoseResultDto } from '../wire';

const SERVER = 'http://backend.test';
const AT = new Date('2026-10-03T10:00:00Z');
const PHOTO: MediaCapture = {
  kind: 'image',
  uri: 'file://capture.jpg',
  mimeType: 'image/jpeg',
  filename: 'capture.jpg',
};
const MEASUREMENT: PoseResultDto = {
  status: 'ok',
  value: 90,
  metric: 'leg_spread',
  unit: 'degrees',
  confidence: 0.9,
  method: 'camera',
  protocol: 'front-facing-leg-spread-v1',
  reason: null,
};

type Seen = { url: string; method: string; auth?: string; body: unknown };

/** A fake server: `answer` picks the status and JSON for each request. */
async function fixture(
  answer: (seen: Seen) => { status: number; body?: unknown },
  token: string | null = 'private-token',
) {
  const storage = createMemoryStore();
  if (token) {
    await storage.setItem(API_TOKEN_KEY, token);
  }
  const seen: Seen[] = [];
  const fetch: MediaFetch = async (url, init) => {
    const request = {
      url: url.replace(SERVER, ''),
      method: init.method,
      auth: init.headers.Authorization,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    };
    seen.push(request);
    const { status, body } = answer(request);
    return {
      ok: status < 400,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    };
  };
  const media = createMediaClient({
    baseUrl: `${SERVER}/`,
    storage,
    fetch,
    now: () => AT,
  });
  return { media, seen, storage };
}

test('there is no media client without a server', () => {
  expect(createMedia(createMemoryStore())).toBeNull();
  expect(createMedia(createMemoryStore(), { apiBaseUrl: ' ' })).toBeNull();
  expect(createMedia(createMemoryStore(), { apiBaseUrl: SERVER })?.server).toBe(
    SERVER,
  );
});

test('uses the backend token and never makes a climber of its own', async () => {
  const { media, seen } = await fixture(() => ({
    status: 200,
    body: MEASUREMENT,
  }));
  await media.analyze(PHOTO, true);
  expect(seen).toEqual([
    expect.objectContaining({
      url: '/v1/pose/image',
      method: 'POST',
      auth: 'Bearer private-token',
    }),
  ]);

  const fresh = await fixture(() => ({ status: 200 }), null);
  await expect(fresh.media.analyze(PHOTO, true)).rejects.toThrow(
    'Your profile is not on the server yet',
  );
  expect(fresh.seen).toHaveLength(0);
});

test('sends nothing without consent', async () => {
  const { media, seen } = await fixture(() => ({ status: 200 }));
  await expect(media.analyze(PHOTO, false)).rejects.toThrow('consent');
  await expect(
    media.saveHandPhoto(
      PHOTO,
      {
        side: 'left',
        view: 'palm',
        region: 'palm',
        pain: 0,
        spots: [],
        note: '',
      },
      false,
    ),
  ).rejects.toThrow('consent');
  await expect(
    media.startLive({ snapshot: jest.fn() }, false, {
      onResult: () => {},
      onError: () => {},
    }),
  ).rejects.toThrow('consent');
  expect(seen).toHaveLength(0);
});

test('a photo is analysed transiently and read as one sample', async () => {
  const { media, seen } = await fixture(() => ({
    status: 200,
    body: MEASUREMENT,
  }));
  const reading = await media.analyze(PHOTO, true);
  expect(reading).toEqual({
    result: MEASUREMENT,
    last: MEASUREMENT,
    valid: 1,
    total: 1,
  });
  const form = seen[0].body as { get(key: string): unknown };
  expect(form.get('upload_consent')).toBe('true');
  expect(form.get('retain_consent')).toBeNull();
});

test('a clip goes to the video route and keeps the latest valid sample', async () => {
  const invalid = {
    ...MEASUREMENT,
    status: 'invalid_capture',
    value: null,
    reason: 'Both hips and ankles must be visible.',
  };
  const { media, seen } = await fixture(() => ({
    status: 200,
    body: {
      frames: [
        { ...MEASUREMENT, value: 80, timestamp_ms: 0 },
        { ...MEASUREMENT, value: 85, timestamp_ms: 200 },
        { ...invalid, timestamp_ms: 400 },
      ],
      duration_ms: 600,
      sampled_frame_count: 3,
      valid_frame_count: 2,
    },
  }));
  const reading = await media.analyze(
    {
      ...PHOTO,
      kind: 'video',
      uri: 'file://clip.webm',
      mimeType: 'video/webm',
    },
    true,
  );
  expect(seen[0].url).toBe('/v1/pose/video');
  expect(reading.result?.value).toBe(85);
  expect(reading.last?.reason).toBe('Both hips and ankles must be visible.');
  expect([reading.valid, reading.total]).toEqual([2, 3]);
});

test("a confirmed result is saved as the climber's own camera reading", async () => {
  const { media, seen } = await fixture(() => ({
    status: 201,
    body: { id: 'a-1' },
  }));
  await media.saveAssessment(MEASUREMENT, true);
  expect(seen[0]).toMatchObject({ url: '/v1/me/assessments', method: 'POST' });
  expect(seen[0].body).toEqual({
    metric: 'leg_spread',
    value: 90,
    unit: 'degrees',
    method: 'camera',
    confidence: 0.9,
    protocol: 'front-facing-leg-spread-v1',
    occurred_at: '2026-10-03T10:00:00.000Z',
  });
});

test('an unconfirmed or invalid result is never saved', async () => {
  const { media, seen } = await fixture(() => ({
    status: 201,
    body: { id: 'a-1' },
  }));
  await expect(media.saveAssessment(MEASUREMENT, false)).rejects.toThrow();
  await expect(
    media.saveAssessment(
      { ...MEASUREMENT, status: 'invalid_capture', value: null },
      true,
    ),
  ).rejects.toThrow();
  expect(seen).toHaveLength(0);
});

test('a hand photo is kept with retention consent and linked to its entry', async () => {
  const { media, seen } = await fixture(({ url }) =>
    url === '/v1/me/photos'
      ? { status: 201, body: { id: 'photo-1' } }
      : { status: 201, body: { id: 'hand-1' } },
  );
  await media.saveHandPhoto(
    PHOTO,
    {
      side: 'left',
      view: 'back',
      region: 'ring_finger',
      pain: null,
      spots: ['a2'],
      note: ' sore after crimps ',
    },
    true,
  );
  const form = seen[0].body as { get(key: string): unknown };
  expect(form.get('upload_consent')).toBe('true');
  expect(form.get('retain_consent')).toBe('true');
  expect(form.get('side')).toBe('left');
  expect(form.get('view')).toBe('back');
  expect(seen[1]).toMatchObject({ url: '/v1/me/hands', method: 'POST' });
  expect(seen[1].body).toEqual({
    side: 'left',
    region: 'ring_finger',
    pain: null,
    spots: ['a2'],
    note: 'sore after crimps',
    photo_id: 'photo-1',
    occurred_at: '2026-10-03T10:00:00.000Z',
  });
});

test('a refused journal entry takes its new photo back off the server', async () => {
  const { media, seen } = await fixture(({ url, method }) =>
    url === '/v1/me/photos'
      ? { status: 201, body: { id: 'photo-1' } }
      : method === 'DELETE'
      ? { status: 204 }
      : { status: 422, body: { detail: 'Journal could not be saved' } },
  );
  await expect(
    media.saveHandPhoto(
      PHOTO,
      {
        side: 'left',
        view: 'palm',
        region: 'palm',
        pain: 2,
        spots: [],
        note: '',
      },
      true,
    ),
  ).rejects.toThrow('Journal could not be saved');
  expect(seen.map(s => `${s.method} ${s.url}`)).toEqual([
    'POST /v1/me/photos',
    'POST /v1/me/hands',
    'DELETE /v1/me/photos/photo-1',
  ]);
});

test('a clip is not a journal photo', async () => {
  const { media, seen } = await fixture(() => ({ status: 201 }));
  await expect(
    media.saveHandPhoto(
      { ...PHOTO, kind: 'video' },
      {
        side: 'left',
        view: 'palm',
        region: 'palm',
        pain: 2,
        spots: [],
        note: '',
      },
      true,
    ),
  ).rejects.toThrow('needs a photo');
  expect(seen).toHaveLength(0);
});

test('after a 401 it retries once with a newer token from the backend', async () => {
  const state = { token: 'old-token' };
  const { media, seen, storage } = await fixture(({ auth }) => {
    if (auth === 'Bearer old-token') {
      // Meanwhile the backend made a new climber after a reset.
      storage.setItem(API_TOKEN_KEY, 'new-token');
      return { status: 401, body: { detail: 'Invalid token' } };
    }
    return { status: 200, body: MEASUREMENT };
  }, state.token);
  await media.analyze(PHOTO, true);
  expect(seen.map(s => s.auth)).toEqual([
    'Bearer old-token',
    'Bearer new-token',
  ]);
});

test('a 401 with no newer token says to reload, without a second try', async () => {
  const { media, seen } = await fixture(() => ({ status: 401 }));
  await expect(media.analyze(PHOTO, true)).rejects.toThrow(
    'The server no longer knows this device',
  );
  expect(seen).toHaveLength(1);
});

test('a server without a pose model is explained', async () => {
  const { media } = await fixture(() => ({
    status: 503,
    body: { detail: 'Pose analyzer is not configured' },
  }));
  await expect(media.analyze(PHOTO, true)).rejects.toThrow(NO_POSE_MODEL);
});

test('the server reason for a bad capture is shown as it is', async () => {
  const { media } = await fixture(() => ({
    status: 400,
    body: { detail: 'Video duration exceeds 60 seconds.' },
  }));
  await expect(media.analyze(PHOTO, true)).rejects.toThrow(
    'Video duration exceeds 60 seconds.',
  );
});

test('no answer names the server it tried', async () => {
  const storage = createMemoryStore();
  await storage.setItem(API_TOKEN_KEY, 'private-token');
  const media = createMediaClient({
    baseUrl: SERVER,
    storage,
    fetch: async () => {
      throw new TypeError('Network request failed');
    },
  });
  await expect(media.analyze(PHOTO, true)).rejects.toThrow(
    'Could not reach the server at http://backend.test.',
  );
});

test('live opens a WebSocket on the same server with the token in the first message', async () => {
  const storage = createMemoryStore();
  await storage.setItem(API_TOKEN_KEY, 'private-token');
  const sent: unknown[] = [];
  const transport: LiveSocket = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: value => sent.push(value),
    close: () => {},
  };
  const urls: string[] = [];
  const media = createMediaClient({
    baseUrl: 'https://monkey.example',
    storage,
    socketFactory: url => {
      urls.push(url);
      return transport;
    },
  });
  const session = await media.startLive({ snapshot: jest.fn() }, true, {
    onResult: () => {},
    onError: () => {},
  });
  expect(urls).toEqual(['wss://monkey.example/v1/pose/stream']);
  transport.onopen!();
  expect(JSON.parse(sent[0] as string)).toMatchObject({
    token: 'private-token',
  });
  session.stop();
});

test('the optional live selector reaches the streaming handshake', async () => {
  const storage = createMemoryStore();
  await storage.setItem(API_TOKEN_KEY, 'private-token');
  const sent: unknown[] = [];
  const transport: LiveSocket = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: value => sent.push(value),
    close: () => {},
  };
  const media = createMediaClient({
    baseUrl: SERVER,
    storage,
    socketFactory: () => transport,
  });
  const session = await media.startLive(
    { snapshot: jest.fn() },
    true,
    { onResult: jest.fn(), onError: jest.fn() },
    { metric: 'shoulder_reach' },
  );
  transport.onopen!();
  expect(JSON.parse(sent[0] as string)).toMatchObject({
    metric: 'shoulder_reach',
  });
  session.stop();
});
