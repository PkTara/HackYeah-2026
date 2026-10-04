/**
 * The camera assessment and the hand photo journal: what stays on the
 * device, what needs consent, and what gets cleaned up.
 */
import { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import { sampleGame } from '@hackyeah/core';
import { demoLivePose } from '../demo/pose';
import type { MediaCapture } from '@hackyeah/platform';
import {
  MEASUREMENT,
  control,
  has,
  photo,
  press,
  render,
  setup,
  socket,
  text,
  type,
  useFakeTimers,
} from '../testing/cameraFixture';

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Captures the screen's AppState listener. */
function appState() {
  const listener: { change?: (state: string) => void } = {};
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    callback: (state: string) => void,
  ) => {
    listener.change = callback;
    return { remove: () => {} };
  }) as never);
  return listener;
}

/** Open the transport and allow its first sampled JPEG frame. */
async function ready(live: ReturnType<typeof socket>) {
  await act(async () => {
    live.transport.onopen?.();
    live.transport.onmessage?.({
      data: JSON.stringify({
        type: 'ready',
        max_frame_bytes: 8192,
        max_duration_ms: 60000,
      }),
    });
  });
}

async function result(live: ReturnType<typeof socket>, overrides = {}) {
  const headers = live.sent
    .filter((value): value is string => typeof value === 'string')
    .map(value => JSON.parse(value))
    .filter(value => value.type === 'frame');
  await act(async () =>
    live.transport.onmessage?.({
      data: JSON.stringify({
        ...demoLivePose('leg_spread', 0),
        ...MEASUREMENT,
        ...overrides,
        type: 'result',
        timestamp_ms: headers[headers.length - 1].timestamp_ms,
      }),
    }),
  );
}

function liveFixture(options: Parameters<typeof setup>[0] = {}) {
  const live = socket();
  const fixture = setup({
    live: live.transport,
    camera: {
      snapshot: async () =>
        photo({ bytes: new Uint8Array([255, 216, 255, 217]) }),
    },
    ...options,
  });
  return { live, fixture };
}

describe('camera assessment', () => {
  it('keeps camera and uploads off until Record, then streams with saved permission', async () => {
    const { fixture, live } = liveFixture();
    const screen = await render(fixture, 'Assessment');
    expect(fixture.preview.active).toBe(false);
    expect(fixture.requests).toEqual([]);
    expect(control(screen, 'Take photo')).toBeUndefined();
    expect(control(screen, 'Record clip')).toBeUndefined();
    expect(
      control(
        screen,
        'Send for analysis, I consent to sending this capture to the server for analysis.',
      ),
    ).toBeUndefined();
    await press(screen, 'Record');
    expect(fixture.preview.active).toBe(true);
    expect(fixture.requests).toEqual([
      { url: 'ws://server.test/v1/pose/stream', method: 'WS', body: null },
    ]);
    await ready(live);
    expect(JSON.parse(live.sent[0] as string)).toMatchObject({
      type: 'start',
      token: 'secret',
      upload_consent: true,
      metric: 'leg_spread',
    });
    expect(live.sent).toHaveLength(3);
    await act(async () => screen.unmount());
    expect(live.state.closed).toBe(true);
  });

  it('withheld permission disables Record and Settings returns to the selected assessment', async () => {
    const { fixture, live } = liveFixture({ privacy: false });
    const screen = await render(fixture, 'Data');
    await press(screen, 'Open shoulder reach');
    await press(screen, 'Shoulder reach assessment');
    expect(control(screen, 'Record').props.disabled).toBe(true);
    await press(screen, 'Record');
    expect(fixture.preview.active).toBe(false);
    expect(fixture.requests).toEqual([]);
    await press(screen, 'Settings');
    expect(has(screen, 'Back to Shoulder reach')).toBe(true);
    await press(
      screen,
      'Live camera analysis, Allow frames to be sent while a camera assessment is recording.',
    );
    await press(screen, 'Back to Record shoulder reach', 'Record');
    await ready(live);
    expect(JSON.parse(live.sent[0] as string)).toMatchObject({
      metric: 'shoulder_reach',
    });
    expect(
      JSON.parse(
        (await fixture.capabilities.storage.getItem(
          'climbing-monkey/privacy/v1',
        ))!,
      ),
    ).toEqual({ version: 1, cameraAnalysis: true, handPhotos: false });
    await act(async () => screen.unmount());
  });

  it('manual Stop reviews the rounded result and Retry starts another session without saving', async () => {
    const { fixture, live } = liveFixture();
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Record');
    await ready(live);
    await result(live, { value: 143.857 });
    expect(text(screen)).toContain('144°');
    expect(text(screen)).toContain('not a validated flexibility test');
    expect(control(screen, 'Save result')).toBeUndefined();
    await press(screen, 'Stop');
    expect(text(screen)).toContain('Review your result: 144°');
    expect(live.state.closed).toBe(true);
    expect(fixture.preview.active).toBe(false);
    expect(control(screen, 'Save result').props.disabled).toBe(false);
    expect((await fixture.backend.load()).assessments ?? []).toEqual([]);
    await press(screen, 'Retry');
    expect(fixture.preview.active).toBe(true);
    expect(control(screen, 'Save result')).toBeUndefined();
    expect(fixture.requests).toHaveLength(2);
    await act(async () => screen.unmount());
  });

  it('invalid live samples offer no reviewed number or save', async () => {
    const { fixture, live } = liveFixture();
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Record');
    await ready(live);
    await result(live, {
      status: 'invalid_capture',
      value: null,
      landmarks: [],
      reason: 'Both hips and ankles must be visible.',
    });
    await press(screen, 'Stop');
    expect(control(screen, 'Save result')).toBeUndefined();
    expect(text(screen)).not.toContain('Review your result');
    expect(fixture.preview.active).toBe(false);
    await act(async () => screen.unmount());
  });

  it('shows live analysis failure, closes resources and offers Record again', async () => {
    const { fixture, live } = liveFixture();
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Record');
    await ready(live);
    await act(async () =>
      live.transport.onmessage?.({
        data: JSON.stringify({
          type: 'error',
          detail: 'Pose analyzer is not configured',
        }),
      }),
    );
    expect(text(screen)).toContain('Pose analyzer is not configured');
    expect(fixture.preview.active).toBe(false);
    expect(live.state.closed).toBe(true);
    expect(control(screen, 'Record')).toBeDefined();
    expect(control(screen, 'Save result')).toBeUndefined();
    await act(async () => screen.unmount());
  });

  it('reports denied camera permission without starting an upload', async () => {
    const fixture = setup({ denied: 'Camera permission denied' });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Record');
    expect(text(screen)).toContain('Camera permission denied');
    expect(fixture.preview.active).toBe(false);
    expect(control(screen, 'Record')).toBeDefined();
    expect(fixture.requests).toEqual([]);
    await act(async () => screen.unmount());
  });

  it('stops an established stream when inactive and remains closed when backgrounded', async () => {
    useFakeTimers();
    const listener = appState();
    const { fixture, live } = liveFixture();
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Record');
    await ready(live);
    await result(live);
    expect(fixture.preview.active).toBe(true);
    expect(live.state.closed).toBe(false);
    expect(live.sent).toHaveLength(3);
    await act(async () => listener.change?.('inactive'));
    expect(fixture.preview.active).toBe(false);
    expect(live.state.closed).toBe(true);
    const count = live.sent.length;
    await act(async () => jest.advanceTimersByTime(2000));
    expect(live.sent).toHaveLength(count);
    await act(async () => listener.change?.('background'));
    expect(fixture.preview.active).toBe(false);
    expect(live.state.closed).toBe(true);
    await act(async () => jest.advanceTimersByTime(2000));
    expect(live.sent).toHaveLength(count);
    await act(async () => screen.unmount());
  });

  it('releases a pending frame after Stop without sending it', async () => {
    let finish!: (capture: MediaCapture) => void;
    const late = photo({ bytes: new Uint8Array([1, 2, 3]) });
    const { fixture, live } = liveFixture({
      camera: {
        snapshot: () =>
          new Promise(resolve => {
            finish = resolve;
          }),
      },
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Record');
    await ready(live);
    await press(screen, 'Stop');
    await act(async () => finish(late));
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(live.sent.filter(value => value instanceof ArrayBuffer)).toEqual([]);
    expect(fixture.preview.active).toBe(false);
    await act(async () => screen.unmount());
  });
});

describe('hand photo journal', () => {
  it('withheld hand-photo permission permits local review but prevents upload even when analysis is allowed', async () => {
    const fixture = setup({
      privacy: { cameraAnalysis: true, handPhotos: false },
    });
    const screen = await render(fixture, 'HandCapture');
    await press(
      screen,
      'Start camera',
      'Take photo',
      'Left hand',
      'Photo of the palm',
      'Index finger',
      'Pain 3',
    );
    expect(has(screen, 'Captured photo')).toBe(true);
    expect(control(screen, 'Save to journal').props.disabled).toBe(true);
    await press(screen, 'Save to journal');
    expect(fixture.requests).toEqual([]);
    expect(text(screen)).toContain('Enable Private hand photos in Settings');
    await act(async () => screen.unmount());
  });

  it('saves a reviewed photo with its details using separately saved permission', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'HandCapture');
    await press(screen, 'Start camera', 'Take photo');
    expect(control(screen, 'Save to journal').props.disabled).toBe(true);
    await press(
      screen,
      'Right hand',
      'Photo of the back',
      'Index finger',
      'Pain 6',
    );
    await type(screen, 'Note', ' After climbing ');
    expect(control(screen, 'Save to journal').props.disabled).toBe(false);
    expect(
      control(
        screen,
        'Upload and keep, I consent to uploading and retaining this hand photo and journal entry.',
      ),
    ).toBeUndefined();
    await press(screen, 'Save to journal');
    expect(text(screen)).toContain('Saved to your hand journal.');
    expect(fixture.requests.map(r => r.url)).toEqual([
      '/v1/me/photos',
      '/v1/me/hands',
    ]);
    const form = fixture.requests[0].body as { get(key: string): unknown };
    expect(form.get('side')).toBe('right');
    expect(form.get('view')).toBe('back');
    expect(form.get('upload_consent')).toBe('true');
    expect(form.get('retain_consent')).toBe('true');
    expect(fixture.requests[1].body).toMatchObject({
      side: 'right',
      region: 'index_finger',
      pain: 6,
      spots: [],
      note: 'After climbing',
      photo_id: 'saved-/v1/me/photos',
    });
    await act(async () => screen.unmount());
  });

  it('needs the hand, the view, the place and the pain', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'HandCapture');
    await press(screen, 'Start camera', 'Take photo');
    await press(screen, 'Left hand', 'Photo of the palm', 'Wrist');
    expect(control(screen, 'Save to journal').props.disabled).toBe(true);
    await press(screen, 'Sore, no number');
    expect(control(screen, 'Save to journal').props.disabled).toBe(false);
    await press(screen, 'Save to journal');
    expect(fixture.requests[1].body).toMatchObject({
      side: 'left',
      region: 'wrist',
      pain: null,
    });
    await act(async () => screen.unmount());
  });

  it('starts on the finger it was opened from and keeps its marked spots', async () => {
    const fixture = setup({
      state: {
        ...sampleGame,
        onboardingSkipped: true,
        flags: [
          { side: 'right', finger: 'ring', date: '2026-10-01', spots: ['a2'] },
        ],
      },
    });
    const screen = await render(fixture, 'Hands');
    await press(screen, 'Right ring finger');
    await press(screen, 'Add a photo of your right ring finger');
    await press(screen, 'Start camera', 'Take photo');
    expect(text(screen)).toContain('It keeps the spots you marked: A2 pulley.');
    await press(screen, 'Photo of the palm', 'Pain 3', 'Save to journal');
    expect(fixture.requests[1].body).toMatchObject({
      side: 'right',
      region: 'ring_finger',
      pain: 3,
      spots: ['a2'],
    });
    await act(async () => screen.unmount());
  });

  it('removes the kept photo when its journal entry is refused', async () => {
    const fixture = setup({
      answer: request =>
        request.url === '/v1/me/hands'
          ? { status: 422, body: { detail: 'Journal could not be saved' } }
          : request.method === 'DELETE'
          ? { status: 204 }
          : { status: 201, body: { id: 'photo-1' } },
    });
    const screen = await render(fixture, 'HandCapture');
    await press(screen, 'Start camera', 'Take photo');
    await press(
      screen,
      'Left hand',
      'Photo of the palm',
      'Palm',
      'Pain 0, none',
    );
    await press(screen, 'Save to journal');
    expect(text(screen)).toContain('Journal could not be saved');
    expect(fixture.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      'POST /v1/me/photos',
      'POST /v1/me/hands',
      'DELETE /v1/me/photos/photo-1',
    ]);
    await act(async () => screen.unmount());
  });
});
