import { useEffect } from 'react';
import { View } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { createMemoryStore } from '@hackyeah/platform';
import type {
  CameraPreviewProps,
  CameraSession,
  MediaCapture,
} from '@hackyeah/platform';
import { CaptureScreen } from '../screens/CaptureScreen';
import { createClimbingApi, type PoseResult } from '../api';

const measurement: PoseResult = {
  status: 'ok',
  value: 92,
  metric: 'leg_spread',
  unit: 'degrees',
  confidence: 0.9,
  reason: null,
  protocol: 'image-plane-v1',
  method: 'camera',
};
function setup(
  mode: 'assessment' | 'hand' = 'assessment',
  cameraOverride: Partial<CameraSession> = {},
  fetchOverride?: (url: string, init?: RequestInit) => Promise<Response>,
) {
  const captures: MediaCapture[] = [];
  const camera: CameraSession = {
    snapshot: async () => {
      const capture: MediaCapture = {
        kind: 'image',
        uri: 'file:///frame.jpg',
        filename: 'frame.jpg',
        mimeType: 'image/jpeg',
        release: jest.fn(),
      };
      captures.push(capture);
      return capture;
    },
    ...cameraOverride,
  };
  const requests: { url: string; init?: RequestInit }[] = [];
  const api = createClimbingApi(createMemoryStore(), {
    fetcher: async (url, init) => {
      requests.push({ url, init });
      if (fetchOverride) {
        return fetchOverride(url, init);
      }
      return {
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith('/climbers')
            ? { token: 'secret' }
            : url.endsWith('/image')
            ? measurement
            : { id: 'saved' },
      } as Response;
    },
  });
  let previewActive = false;
  function Preview({ active, onReady }: CameraPreviewProps) {
    previewActive = active;
    useEffect(() => {
      onReady(active ? camera : null);
    }, [active, onReady]);
    return <View />;
  }
  return {
    api,
    Preview,
    camera,
    captures,
    requests,
    active: () => previewActive,
    mode,
  };
}
async function render(fixture: ReturnType<typeof setup>) {
  let screen!: Renderer.ReactTestRenderer;
  await act(async () => {
    screen = Renderer.create(
      <CaptureScreen
        mode={fixture.mode}
        api={fixture.api}
        Preview={fixture.Preview}
      />,
    );
  });
  return screen;
}
function button(screen: Renderer.ReactTestRenderer, title: string) {
  return screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.findAllByProps({ children: title }).length > 0,
  )[0];
}
async function press(screen: Renderer.ReactTestRenderer, title: string) {
  await act(async () => {
    button(screen, title).props.onPress();
  });
}
function text(screen: Renderer.ReactTestRenderer) {
  function flatten(node: unknown): string {
    if (typeof node === 'string') {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(flatten).join('');
    }
    return node && typeof node === 'object'
      ? flatten((node as { children?: unknown }).children)
      : '';
  }
  return flatten(screen.toJSON());
}
async function consent(screen: Renderer.ReactTestRenderer) {
  await act(async () => {
    screen.root
      .findAllByProps({ accessibilityRole: 'checkbox' })[0]
      .props.onPress();
  });
}

it('activates preview only after starting camera', async () => {
  const fixture = setup();
  const screen = await render(fixture);
  expect(fixture.active()).toBe(false);
  expect(button(screen, 'Start camera')).toBeDefined();
  await press(screen, 'Start camera');
  expect(fixture.active()).toBe(true);
  expect(fixture.requests).toHaveLength(0);
  await act(async () => screen.unmount());
});

it('reviews a local snapshot and releases it on retake without uploading', async () => {
  const fixture = setup();
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  expect(button(screen, 'Snapshot')).toBeDefined();
  await press(screen, 'Snapshot');
  expect(
    screen.root.findAllByProps({ accessibilityLabel: 'Captured photo' }).length,
  ).toBeGreaterThan(0);
  expect(fixture.active()).toBe(false);
  expect(fixture.requests).toHaveLength(0);
  await press(screen, 'Retake');
  expect(fixture.captures[0].release).toHaveBeenCalledTimes(1);
  expect(fixture.active()).toBe(true);
  await act(async () => screen.unmount());
});

it('requires upload consent and separately confirmed measurement before saving', async () => {
  const fixture = setup();
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Snapshot');
  expect(button(screen, 'Analyze capture')).toBeDefined();
  expect(button(screen, 'Analyze capture').props.disabled).toBe(true);
  await press(screen, 'Analyze capture');
  expect(fixture.requests).toHaveLength(0);
  await consent(screen);
  await press(screen, 'Analyze capture');
  expect(text(screen)).toContain('92');
  expect(text(screen)).toContain('Estimated image-plane angle');
  expect(
    fixture.requests.filter(r => r.url.endsWith('/assessments')),
  ).toHaveLength(0);
  expect(button(screen, 'Save measurement').props.disabled).toBe(true);
  await act(async () => {
    screen.root
      .findAllByProps({ accessibilityLabel: 'Confirm measurement' })[0]
      .props.onPress();
  });
  await press(screen, 'Save measurement');
  expect(text(screen)).toContain('Measurement saved');
  expect(
    JSON.parse(
      fixture.requests.find(r => r.url.endsWith('/assessments'))!.init!
        .body as string,
    ),
  ).toMatchObject({ value: 92, method: 'camera' });
  await act(async () => screen.unmount());
});

it('saves a reviewed hand photo with selected fields only after retention consent', async () => {
  const fixture = setup('hand');
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Snapshot');
  expect(button(screen, 'Save hand journal')).toBeDefined();
  await press(screen, 'Save hand journal');
  expect(fixture.requests).toHaveLength(0);
  await press(screen, 'Right hand');
  await press(screen, 'Back of hand');
  expect(button(screen, 'Index finger')).toBeDefined();
  await press(screen, 'Index finger');
  await act(async () => {
    screen.root
      .findAllByProps({ accessibilityLabel: 'Pain from 0 to 10' })[0]
      .props.onChangeText('6');
    screen.root
      .findAllByProps({ accessibilityLabel: 'Hand note' })[0]
      .props.onChangeText('After climbing');
  });
  await consent(screen);
  await press(screen, 'Save hand journal');
  expect(text(screen)).toContain('Hand journal saved');
  expect(
    JSON.parse(
      fixture.requests.find(r => r.url.endsWith('/hands'))!.init!
        .body as string,
    ),
  ).toMatchObject({
    side: 'right',
    region: 'index_finger',
    pain: 6,
    note: 'After climbing',
  });
  const photoForm = fixture.requests.find(request =>
    request.url.endsWith('/photos'),
  )!.init!.body as unknown as { getAll(key: string): unknown[] };
  expect(photoForm.getAll('view')).toEqual(['back']);
  await act(async () => screen.unmount());
});

it('stops browser video at 30 seconds and reviews valid sample counts after consent', async () => {
  jest.useFakeTimers();
  let recording = false;
  const clip: MediaCapture = {
    kind: 'video',
    uri: 'blob:clip',
    mimeType: 'video/webm',
    filename: 'clip.webm',
    release: jest.fn(),
  };
  const fixture = setup(
    'assessment',
    {
      startRecording: async () => {
        recording = true;
      },
      stopRecording: async () => {
        recording = false;
        return clip;
      },
    },
    async url =>
      ({
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith('/climbers')
            ? { token: 'secret' }
            : {
                frames: [{ ...measurement, timestamp_ms: 100 }],
                sampled_frame_count: 3,
                valid_frame_count: 1,
                duration_ms: 1000,
              },
      } as Response),
  );
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  expect(button(screen, 'Record video')).toBeDefined();
  await press(screen, 'Record video');
  expect(recording).toBe(true);
  await act(async () => jest.advanceTimersByTime(30000));
  expect(recording).toBe(false);
  expect(
    screen.root.findAllByProps({ accessibilityLabel: 'Captured video' }).length,
  ).toBeGreaterThan(0);
  expect(fixture.requests).toHaveLength(0);
  await consent(screen);
  await press(screen, 'Analyze capture');
  expect(text(screen)).toContain('1 / 3 valid samples');
  expect(text(screen)).toContain('92');
  await act(async () => screen.unmount());
  expect(clip.release).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it('requires consent for sampled live analysis and closes the connection on unmount', async () => {
  jest.useFakeTimers();
  const original = globalThis.WebSocket;
  let closed = false;
  const sent: unknown[] = [];
  const socket: import('../livePose').LiveSocket = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: value => sent.push(value),
    close: () => {
      closed = true;
    },
  };
  globalThis.WebSocket = jest.fn(() => socket) as unknown as typeof WebSocket;
  const fixture = setup('assessment', {
    snapshot: async () => ({
      kind: 'image',
      uri: 'frame',
      mimeType: 'image/jpeg',
      filename: 'frame.jpg',
      bytes: new Uint8Array([1, 2]),
    }),
  });
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  expect(button(screen, 'Start live analysis')).toBeDefined();
  await press(screen, 'Start live analysis');
  expect(fixture.requests).toHaveLength(0);
  expect(sent).toHaveLength(0);
  await consent(screen);
  await press(screen, 'Start live analysis');
  await act(async () => {
    socket.onopen?.();
    socket.onmessage?.({
      data: JSON.stringify({
        type: 'ready',
        max_frame_bytes: 100,
        max_duration_ms: 60000,
      }),
    });
  });
  const frame = JSON.parse(sent[1] as string);
  await act(async () =>
    socket.onmessage?.({
      data: JSON.stringify({
        ...measurement,
        type: 'result',
        timestamp_ms: frame.timestamp_ms,
      }),
    }),
  );
  expect(text(screen)).toContain('1 / 1 valid samples');
  expect(text(screen)).toContain('92');
  await act(async () => screen.unmount());
  expect(closed).toBe(true);
  const count = sent.length;
  await act(async () => jest.advanceTimersByTime(1000));
  expect(sent).toHaveLength(count);
  globalThis.WebSocket = original;
  jest.useRealTimers();
});

it('stops recording and releases the discarded clip when backgrounded', async () => {
  jest.useFakeTimers();
  const { AppState } = require('react-native');
  let background!: (state: string) => void;
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event: any, callback: any) => {
      background = callback;
      return { remove: () => {} };
    });
  const release = jest.fn();
  let recording = false;
  const fixture = setup('assessment', {
    startRecording: async () => {
      recording = true;
    },
    stopRecording: async () => {
      recording = false;
      return {
        kind: 'video',
        uri: 'clip',
        mimeType: 'video/webm',
        filename: 'clip.webm',
        release,
      };
    },
  });
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Record video');
  expect(recording).toBe(true);
  expect(background).toBeDefined();
  await act(async () => background('background'));
  expect(recording).toBe(false);
  expect(release).toHaveBeenCalledTimes(1);
  expect(fixture.active()).toBe(false);
  await act(async () => screen.unmount());
  listener.mockRestore();
  jest.useRealTimers();
});

it('opens both capture modes from home and returns with camera inactive', async () => {
  const { App } = require('../App');
  let screen!: Renderer.ReactTestRenderer;
  await act(async () => {
    screen = Renderer.create(
      <App
        capabilities={{
          platform: 'other',
          platformLabel: 'Test OS',
          haptics: { isAvailable: false, tap: () => {} },
          storage: createMemoryStore(),
        }}
      />,
    );
  });
  expect(button(screen, 'Camera assessment')).toBeDefined();
  await press(screen, 'Camera assessment');
  expect(text(screen)).toContain('Start camera');
  await press(screen, 'Back');
  await press(screen, 'Hand journal');
  expect(text(screen)).toContain('Hand journal');
  expect(text(screen)).toContain('Start camera');
  await press(screen, 'Back');
  expect(text(screen)).toContain('Counter');
  await act(async () => screen.unmount());
});

it('shows denied camera permission with a way to retry', async () => {
  const fixture = setup();
  function Denied({ active, onError }: CameraPreviewProps) {
    useEffect(() => {
      if (active) {
        onError('Camera permission denied');
      }
    }, [active, onError]);
    return <View />;
  }
  let screen!: Renderer.ReactTestRenderer;
  await act(async () => {
    screen = Renderer.create(
      <CaptureScreen mode="assessment" api={fixture.api} Preview={Denied} />,
    );
  });
  await press(screen, 'Start camera');
  expect(text(screen)).toContain('Camera permission denied');
  expect(button(screen, 'Start camera')).toBeDefined();
  expect(fixture.requests).toHaveLength(0);
  await act(async () => screen.unmount());
});

it('keeps an intentional system camera clip when returning from its background handoff', async () => {
  const { AppState } = require('react-native');
  let background!: (state: string) => void;
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event: any, callback: any) => {
      background = callback;
      return { remove: () => {} };
    });
  let finish!: (capture: MediaCapture) => void;
  const release = jest.fn();
  const fixture = setup('assessment', {
    recordVideo: () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  });
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Record video');
  await act(async () => background('background'));
  expect(fixture.active()).toBe(true);
  await act(async () =>
    finish({
      kind: 'video',
      uri: 'native:clip',
      filename: 'clip.mp4',
      mimeType: 'video/mp4',
      release,
    }),
  );
  expect(
    screen.root.findAllByProps({ accessibilityLabel: 'Captured video' }).length,
  ).toBeGreaterThan(0);
  expect(release).not.toHaveBeenCalled();
  await act(async () => screen.unmount());
  expect(release).toHaveBeenCalledTimes(1);
  listener.mockRestore();
});

it('releases a late snapshot after the user stops camera', async () => {
  let finish!: (capture: MediaCapture) => void;
  const release = jest.fn();
  const fixture = setup('assessment', {
    snapshot: () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  });
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Snapshot');
  expect(button(screen, 'Stop camera')).toBeDefined();
  await press(screen, 'Stop camera');
  await act(async () =>
    finish({
      kind: 'image',
      uri: 'late:image',
      filename: 'late.jpg',
      mimeType: 'image/jpeg',
      release,
    }),
  );
  expect(
    screen.root.findAllByProps({ accessibilityLabel: 'Captured photo' }),
  ).toHaveLength(0);
  expect(release).toHaveBeenCalledTimes(1);
  expect(fixture.active()).toBe(false);
  await act(async () => screen.unmount());
});

it('reports a clip with no valid measurements without enabling save', async () => {
  const fixture = setup(
    'assessment',
    {
      recordVideo: async () => ({
        kind: 'video',
        uri: 'clip',
        mimeType: 'video/mp4',
        filename: 'clip.mp4',
      }),
    },
    async url =>
      ({
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith('/climbers')
            ? { token: 'secret' }
            : {
                frames: [],
                sampled_frame_count: 3,
                valid_frame_count: 0,
                duration_ms: 1000,
              },
      } as Response),
  );
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Record video');
  await consent(screen);
  await press(screen, 'Analyze capture');
  expect(text(screen)).toContain('0 / 3 valid samples');
  expect(text(screen)).toContain('No valid measurement');
  expect(button(screen, 'Save measurement')).toBeUndefined();
  await act(async () => screen.unmount());
});

it('shows network analysis failure and allows a retry with the same reviewed media', async () => {
  let fail = true;
  const fixture = setup('assessment', {}, async url => {
    if (url.endsWith('/climbers')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ token: 'secret' }),
      } as Response;
    }
    if (fail) {
      fail = false;
      throw new Error('Network unavailable');
    }
    return { ok: true, status: 200, json: async () => measurement } as Response;
  });
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Snapshot');
  await consent(screen);
  await press(screen, 'Analyze capture');
  expect(text(screen)).toContain('Network unavailable');
  expect(button(screen, 'Analyze capture').props.disabled).toBe(false);
  expect(button(screen, 'Save measurement')).toBeUndefined();
  await press(screen, 'Analyze capture');
  expect(text(screen)).toContain('92');
  await act(async () => screen.unmount());
});

it('ignores a late analysis after retaking the capture', async () => {
  let finish!: (response: Response) => void;
  const fixture = setup('assessment', {}, async url =>
    url.endsWith('/climbers')
      ? ({
          ok: true,
          status: 200,
          json: async () => ({ token: 'secret' }),
        } as Response)
      : new Promise(resolve => {
          finish = resolve;
        }),
  );
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Snapshot');
  await consent(screen);
  await press(screen, 'Analyze capture');
  await press(screen, 'Retake');
  await act(async () =>
    finish({
      ok: true,
      status: 200,
      json: async () => measurement,
    } as Response),
  );
  expect(text(screen)).not.toContain('Estimated image-plane angle');
  expect(fixture.active()).toBe(true);
  expect(fixture.captures[0].release).toHaveBeenCalledTimes(1);
  expect(button(screen, 'Save measurement')).toBeUndefined();
  await act(async () => screen.unmount());
});

it('requires a whole pain score before any hand upload', async () => {
  const fixture = setup('hand');
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Snapshot');
  await consent(screen);
  await act(async () =>
    screen.root
      .findAllByProps({ accessibilityLabel: 'Pain from 0 to 10' })[0]
      .props.onChangeText('6.5'),
  );
  expect(button(screen, 'Save hand journal').props.disabled).toBe(true);
  await press(screen, 'Save hand journal');
  expect(fixture.requests).toHaveLength(0);
  await act(async () => screen.unmount());
});

it('keeps preview startup active through a temporary permission-dialog inactive state', async () => {
  const { AppState } = require('react-native');
  let change!: (state: string) => void;
  const subscribe = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, callback) => {
      change = callback as (state: string) => void;
      return { remove: jest.fn() };
    });
  const fixture = setup();
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await act(async () => change('inactive'));
  expect(fixture.active()).toBe(true);
  await act(async () => change('background'));
  expect(fixture.active()).toBe(false);
  await act(async () => screen.unmount());
  subscribe.mockRestore();
});

it('presents camera geometry as a rounded estimate rather than precise validated flexibility', async () => {
  const fixture = setup(
    'assessment',
    {},
    async url =>
      ({
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith('/climbers')
            ? { token: 'secret' }
            : { ...measurement, value: 143.857190004 },
      } as Response),
  );
  const screen = await render(fixture);
  await press(screen, 'Start camera');
  await press(screen, 'Snapshot');
  await consent(screen);
  await press(screen, 'Analyze capture');
  expect(text(screen)).toContain('Estimated image-plane angle: 144 degrees');
  expect(text(screen)).toContain('not a validated flexibility test');
  await act(async () => screen.unmount());
});
