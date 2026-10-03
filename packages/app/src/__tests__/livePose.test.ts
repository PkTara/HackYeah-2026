import { openLivePose, type LiveSocket } from '../livePose';

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

test('live handshake keeps credentials out of the URL and frames wait for acknowledgement', async () => {
  const { state, transport } = socket();
  let captures = 0;
  const scheduled: (() => void)[] = [];
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
          bytes: new Uint8Array([255, 216, 255, 217]),
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
    schedule: callback => {
      scheduled.push(callback);
      return () => {};
    },
    onResult: () => {},
    onError: message => {
      throw new Error(message);
    },
  });
  expect(typeof transport.onopen).toBe('function');
  transport.onopen!();
  expect(JSON.parse(state.messages[0] as string)).toEqual({
    type: 'start',
    token: 'private-token',
    upload_consent: true,
  });
  transport.onmessage!({
    data: JSON.stringify({
      type: 'ready',
      max_frame_bytes: 8388608,
      max_duration_ms: 60000,
    }),
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(captures).toBe(1);
  expect(JSON.parse(state.messages[1] as string)).toEqual({
    type: 'frame',
    timestamp_ms: 0,
  });
  expect(state.messages[2]).toBeInstanceOf(ArrayBuffer);
  // A timer is only allowed to produce another frame after the matching result.
  expect(state.messages.length).toBe(3);
  controller.stop();
  expect(state.closed).toBe(true);
});

test('an unresponsive live connection times out and releases its socket', () => {
  const { state, transport } = socket();
  const timers: (() => void)[] = [];
  const errors: string[] = [];
  openLivePose({
    url: 'ws://backend.test/v1/pose/stream',
    token: 'private-token',
    consent: true,
    camera: {
      snapshot: async () => {
        throw new Error('No camera frame requested');
      },
    },
    socketFactory: () => transport,
    onResult: () => {},
    onError: message => {
      errors.push(message);
    },
    schedule: callback => {
      timers.push(callback);
      return () => {};
    },
  });
  timers[0]?.();
  expect(state.closed).toBe(true);
  expect(errors).toEqual(['Live analysis timed out']);
});

test('acknowledged frames progress with increasing timestamps and release local captures', async () => {
  const { state, transport } = socket();
  let released = 0;
  const timers: { callback: () => void; delay: number }[] = [];
  const result = { type: 'result', timestamp_ms: 0, status: 'ok', value: 90 };
  const values: number[] = [];
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
        bytes: new Uint8Array([255, 216, 255, 217]),
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
    onResult: measured => {
      values.push(measured.value!);
    },
    onError: message => {
      throw new Error(message);
    },
  });
  transport.onopen!();
  transport.onmessage!({
    data: JSON.stringify({
      type: 'ready',
      max_frame_bytes: 8388608,
      max_duration_ms: 60000,
    }),
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(released).toBe(1);
  transport.onmessage!({ data: JSON.stringify(result) });
  expect(values).toEqual([90]);
  timers.find(timer => timer.delay === 500)!.callback();
  await Promise.resolve();
  await Promise.resolve();
  expect(JSON.parse(state.messages[3] as string)).toEqual({
    type: 'frame',
    timestamp_ms: 1,
  });
  expect(released).toBe(2);
  controller.stop();
});
