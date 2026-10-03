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
