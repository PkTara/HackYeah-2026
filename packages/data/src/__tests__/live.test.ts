import { openLivePose, type LiveSocket } from '../live';

function socket() {
  const state = { messages: [] as (string | ArrayBuffer)[], closed: false };
  const transport: LiveSocket = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: value => {
      state.messages.push(value);
    },
    close: () => {
      state.closed = true;
    },
  };
  return { state, transport };
}

const JPEG = new Uint8Array([255, 216, 255, 217]);
const READY = JSON.stringify({
  type: 'ready',
  max_frame_bytes: 8388608,
  max_duration_ms: 60000,
});
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

test('refuses to open without consent', () => {
  const { transport } = socket();
  const factory = jest.fn(() => transport);
  expect(() =>
    openLivePose({
      url: 'ws://backend.test/v1/pose/stream',
      token: 'private-token',
      consent: false,
      camera: { snapshot: jest.fn() },
      socketFactory: factory,
      onResult: () => {},
      onError: () => {},
    }),
  ).toThrow('consent');
  expect(factory).not.toHaveBeenCalled();
});

test('keeps the token out of the URL, and sends a frame only after the answer to the last', async () => {
  const { state, transport } = socket();
  let captures = 0;
  const controller = openLivePose({
    url: 'ws://backend.test/v1/pose/stream',
    token: 'private-token',
    consent: true,
    camera: {
      snapshot: async () => {
        captures += 1;
        return {
          kind: 'image',
          uri: 'file://frame.jpg',
          filename: 'frame.jpg',
          mimeType: 'image/jpeg',
          bytes: JPEG,
        };
      },
    },
    socketFactory: url => {
      if (url.includes('private-token')) {
        throw new Error('Token leaked');
      }
      return transport;
    },
    now: () => 10,
    schedule: () => () => {},
    onResult: () => {},
    onError: message => {
      throw new Error(message);
    },
  });
  transport.onopen!();
  expect(JSON.parse(state.messages[0] as string)).toEqual({
    type: 'start',
    token: 'private-token',
    upload_consent: true,
  });
  transport.onmessage!({ data: READY });
  await flush();
  expect(captures).toBe(1);
  expect(JSON.parse(state.messages[1] as string)).toEqual({
    type: 'frame',
    timestamp_ms: 0,
  });
  expect(state.messages[2]).toBeInstanceOf(ArrayBuffer);
  // No answer yet, so no second frame.
  expect(state.messages).toHaveLength(3);
  controller.stop();
  expect(JSON.parse(state.messages[3] as string)).toEqual({ type: 'stop' });
  expect(state.closed).toBe(true);
});

test('gives up on a silent server and closes the socket', () => {
  const { state, transport } = socket();
  const timers: (() => void)[] = [];
  const errors: string[] = [];
  const stopped = jest.fn();
  openLivePose({
    url: 'ws://backend.test/v1/pose/stream',
    token: 'private-token',
    consent: true,
    camera: { snapshot: jest.fn() },
    socketFactory: () => transport,
    onResult: () => {},
    onError: message => errors.push(message),
    onStopped: stopped,
    schedule: callback => {
      timers.push(callback);
      return () => {};
    },
  });
  timers[0]();
  expect(state.closed).toBe(true);
  expect(errors).toEqual([
    'Live analysis timed out. Check the server and try again.',
  ]);
  expect(stopped).toHaveBeenCalledTimes(1);
});

test('frames go out with increasing timestamps, and each local frame is released', async () => {
  const { state, transport } = socket();
  let released = 0;
  const timers: { callback: () => void; delay: number }[] = [];
  const values: (number | null)[] = [];
  const controller = openLivePose({
    url: 'ws://backend.test/v1/pose/stream',
    token: 'private-token',
    consent: true,
    camera: {
      snapshot: async () => ({
        kind: 'image',
        uri: 'file://frame.jpg',
        filename: 'frame.jpg',
        mimeType: 'image/jpeg',
        bytes: JPEG,
        release: () => {
          released += 1;
        },
      }),
    },
    socketFactory: () => transport,
    now: () => 10,
    schedule: (callback, delay) => {
      timers.push({ callback, delay });
      return () => {};
    },
    onResult: result => values.push(result.value),
    onError: message => {
      throw new Error(message);
    },
  });
  transport.onopen!();
  transport.onmessage!({ data: READY });
  await flush();
  expect(released).toBe(1);
  transport.onmessage!({
    data: JSON.stringify({
      type: 'result',
      timestamp_ms: 0,
      status: 'ok',
      value: 90,
    }),
  });
  expect(values).toEqual([90]);
  timers.find(timer => timer.delay === 500)!.callback();
  await flush();
  expect(JSON.parse(state.messages[3] as string)).toEqual({
    type: 'frame',
    timestamp_ms: 1,
  });
  expect(released).toBe(2);
  controller.stop();
});

test('passes on the server error and stops', async () => {
  const { state, transport } = socket();
  const errors: string[] = [];
  openLivePose({
    url: 'ws://backend.test/v1/pose/stream',
    token: 'private-token',
    consent: true,
    camera: { snapshot: jest.fn() },
    socketFactory: () => transport,
    schedule: () => () => {},
    onResult: () => {},
    onError: message => errors.push(message),
  });
  transport.onopen!();
  transport.onmessage!({
    data: JSON.stringify({
      type: 'error',
      detail: 'Pose runtime or model is unavailable',
    }),
  });
  expect(errors).toEqual(['Pose runtime or model is unavailable']);
  expect(state.closed).toBe(true);
});

test('a frame bigger than the server allows stops the session', async () => {
  const { state, transport } = socket();
  const errors: string[] = [];
  const release = jest.fn();
  openLivePose({
    url: 'ws://backend.test/v1/pose/stream',
    token: 'private-token',
    consent: true,
    camera: {
      snapshot: async () => ({
        kind: 'image',
        uri: 'file://frame.jpg',
        filename: 'frame.jpg',
        mimeType: 'image/jpeg',
        bytes: JPEG,
        release,
      }),
    },
    socketFactory: () => transport,
    schedule: () => () => {},
    onResult: () => {},
    onError: message => errors.push(message),
  });
  transport.onopen!();
  transport.onmessage!({
    data: JSON.stringify({
      type: 'ready',
      max_frame_bytes: 2,
      max_duration_ms: 60000,
    }),
  });
  await flush();
  expect(errors).toEqual(['A live frame is bigger than the server allows.']);
  expect(release).toHaveBeenCalledTimes(1);
  expect(state.closed).toBe(true);
});

test('requests shoulder metric and preserves timing and overlay metadata', async () => {
  const { state, transport } = socket();
  const onResult = jest.fn();
  const session = openLivePose({
    url: 'ws://backend.test',
    token: 'secret',
    consent: true,
    metric: 'shoulder_reach',
    camera: {
      snapshot: async () => ({
        kind: 'image',
        uri: 'frame',
        filename: 'frame.jpg',
        mimeType: 'image/jpeg',
        bytes: JPEG,
      }),
    },
    socketFactory: () => transport,
    schedule: () => () => {},
    now: () => 10,
    onResult,
    onError: jest.fn(),
  });
  transport.onopen!();
  expect(JSON.parse(state.messages[0] as string).metric).toBe('shoulder_reach');
  transport.onmessage!({ data: READY });
  await flush();
  const result = {
    metric: 'shoulder_reach',
    timestamp_ms: 0,
    landmarks: [{ x: 0.2, y: 0.3, visibility: 1 }],
    image_width: 640,
    image_height: 480,
    left_value: 170,
    right_value: 175,
  };
  transport.onmessage!({ data: JSON.stringify({ type: 'result', ...result }) });
  expect(onResult).toHaveBeenCalledWith(result);
  session.stop();
});

test('stopping from the result callback schedules no further frame', async () => {
  const { transport } = socket();
  const schedule = jest.fn((_callback: () => void, _delay: number) => () => {});
  const session = openLivePose({
    url: 'ws://backend.test',
    token: 'secret',
    consent: true,
    camera: {
      snapshot: async () => ({
        kind: 'image',
        uri: 'frame',
        filename: 'f.jpg',
        mimeType: 'image/jpeg',
        bytes: JPEG,
      }),
    },
    socketFactory: () => transport,
    now: () => 10,
    schedule,
    onResult: () => session.stop(),
    onError: jest.fn(),
  });
  transport.onopen!();
  transport.onmessage!({ data: READY });
  await flush();
  transport.onmessage!({
    data: JSON.stringify({ type: 'result', timestamp_ms: 0, value: 90 }),
  });
  expect(schedule.mock.calls.some(call => call[1] === 500)).toBe(false);
});

test('stopping releases a pending snapshot without sending its header or bytes', async () => {
  const { state, transport } = socket();
  let resolve!: (capture: import('@hackyeah/platform').MediaCapture) => void;
  const release = jest.fn();
  const session = openLivePose({
    url: 'ws://backend.test',
    token: 'secret',
    consent: true,
    camera: {
      snapshot: () =>
        new Promise(value => {
          resolve = value;
        }),
    },
    socketFactory: () => transport,
    schedule: () => () => {},
    onResult: jest.fn(),
    onError: jest.fn(),
  });
  transport.onopen!();
  transport.onmessage!({ data: READY });
  session.stop();
  resolve({
    kind: 'image',
    uri: 'late',
    mimeType: 'image/jpeg',
    filename: 'f.jpg',
    bytes: JPEG,
    release,
  });
  await flush();
  expect(
    state.messages.map(message =>
      typeof message === 'string' ? JSON.parse(message).type : 'bytes',
    ),
  ).toEqual(['start', 'stop']);
  expect(release).toHaveBeenCalledTimes(1);
});
