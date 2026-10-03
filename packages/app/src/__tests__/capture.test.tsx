/**
 * The camera assessment and the hand photo journal: what stays on the
 * device, what needs consent, and what gets cleaned up.
 */
import { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import { sampleGame } from '@hackyeah/core';
import type { MediaCapture } from '@hackyeah/platform';
import {
  CONFIRM,
  MEASUREMENT,
  SEND,
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

const HAND_CONSENT =
  'Upload and keep, I consent to uploading and retaining this hand photo and journal entry.';

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

describe('camera assessment', () => {
  it('starts with the camera off, and starting it sends nothing', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Assessment');
    expect(fixture.preview.active).toBe(false);
    await press(screen, 'Start camera');
    expect(fixture.preview.active).toBe(true);
    expect(text(screen)).toContain('The preview stays on this device.');
    expect(fixture.requests).toHaveLength(0);
    await act(async () => screen.unmount());
  });

  it('reviews a photo on the device and releases it on retake', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Take photo');
    expect(has(screen, 'Captured photo')).toBe(true);
    expect(fixture.preview.active).toBe(false);
    expect(fixture.requests).toHaveLength(0);
    await press(screen, 'Retake');
    expect(fixture.captures[0].release).toHaveBeenCalledTimes(1);
    expect(fixture.preview.active).toBe(true);
    await act(async () => screen.unmount());
  });

  it('needs consent to analyse and a confirmed review to save', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Take photo');
    expect(text(screen)).toContain('server.test');
    expect(control(screen, 'Analyse photo').props.disabled).toBe(true);
    await press(screen, 'Analyse photo');
    expect(fixture.requests).toHaveLength(0);

    await press(screen, SEND, 'Analyse photo');
    expect(fixture.requests.map(r => r.url)).toEqual(['/v1/pose/image']);
    expect(text(screen)).toContain('Estimated image-plane angle: 92');
    expect(control(screen, 'Save result').props.disabled).toBe(true);

    await press(screen, CONFIRM, 'Save result');
    expect(text(screen)).toContain('Saved to your profile');
    const saved = fixture.requests.find(r => r.url === '/v1/me/assessments');
    expect(saved?.body).toMatchObject({
      metric: 'leg_spread',
      value: 92,
      unit: 'degrees',
      method: 'camera',
      confidence: 0.9,
      protocol: 'front-facing-leg-spread-v1',
    });
    await act(async () => screen.unmount());
  });

  it('rounds the angle and says it is not a validated test', async () => {
    const fixture = setup({
      answer: () => ({ status: 200, body: { ...MEASUREMENT, value: 143.857 } }),
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Take photo', SEND, 'Analyse photo');
    expect(text(screen)).toContain('Estimated image-plane angle: 144 degrees');
    expect(text(screen)).toContain('not a validated flexibility test');
    expect(text(screen)).not.toContain('143.8');
    await act(async () => screen.unmount());
  });

  it('stops a clip at 30 seconds, and counts usable samples after consent', async () => {
    useFakeTimers();
    let recording = false;
    const clip = photo({
      kind: 'video',
      uri: 'blob:clip',
      mimeType: 'video/webm',
    });
    const fixture = setup({
      camera: {
        startRecording: async () => {
          recording = true;
        },
        stopRecording: async () => {
          recording = false;
          return clip;
        },
      },
      answer: () => ({
        status: 200,
        body: {
          frames: [{ ...MEASUREMENT, timestamp_ms: 100 }],
          sampled_frame_count: 3,
          valid_frame_count: 1,
          duration_ms: 1000,
        },
      }),
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Record clip');
    expect(recording).toBe(true);
    expect(text(screen)).toContain('stops by itself after 30 seconds');
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(recording).toBe(false);
    expect(has(screen, 'Captured video')).toBe(true);
    expect(fixture.requests).toHaveLength(0);

    await press(screen, SEND, 'Analyse clip');
    expect(fixture.requests.map(r => r.url)).toEqual(['/v1/pose/video']);
    expect(has(screen, '1 of 3 usable')).toBe(true);
    expect(text(screen)).toContain('92');
    await act(async () => screen.unmount());
    expect(clip.release).toHaveBeenCalledTimes(1);
  });

  it('says why a clip has no usable sample and offers no save', async () => {
    const fixture = setup({
      camera: {
        startRecording: async () => {},
        stopRecording: async () => photo({ kind: 'video', uri: 'blob:clip' }),
      },
      answer: () => ({
        status: 200,
        body: {
          frames: [
            {
              ...MEASUREMENT,
              status: 'invalid_capture',
              value: null,
              reason: 'Both hips and ankles must be visible.',
              timestamp_ms: 0,
            },
          ],
          sampled_frame_count: 3,
          valid_frame_count: 0,
          duration_ms: 1000,
        },
      }),
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Record clip', 'Stop recording');
    await press(screen, SEND, 'Analyse clip');
    expect(has(screen, '0 of 3 usable')).toBe(true);
    expect(text(screen)).toContain('No valid measurement');
    expect(text(screen)).toContain('Both hips and ankles must be visible.');
    expect(control(screen, 'Save result')).toBeUndefined();
    await act(async () => screen.unmount());
  });

  it('explains a server without a pose model instead of showing a number', async () => {
    const fixture = setup({
      answer: () => ({
        status: 503,
        body: { detail: 'Pose analyzer is not configured' },
      }),
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Take photo', SEND, 'Analyse photo');
    expect(text(screen)).toContain('it has no pose model');
    expect(text(screen)).toContain('POSE_MODEL_PATH');
    expect(control(screen, 'Save result')).toBeUndefined();
    await act(async () => screen.unmount());
  });

  it('shows a network failure and sends the same photo again', async () => {
    let fail = true;
    const fixture = setup({
      answer: async () => {
        if (fail) {
          fail = false;
          throw new Error('offline');
        }
        return { status: 200, body: MEASUREMENT };
      },
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Take photo', SEND, 'Analyse photo');
    expect(text(screen)).toContain(
      'Could not reach the server at http://server.test',
    );
    expect(control(screen, 'Analyse photo').props.disabled).toBe(false);
    await press(screen, 'Analyse photo');
    expect(text(screen)).toContain('Estimated image-plane angle: 92');
    expect(fixture.captures).toHaveLength(1);
    await act(async () => screen.unmount());
  });

  it('drops a late analysis after a retake', async () => {
    let finish!: () => void;
    const fixture = setup({
      answer: () =>
        new Promise(resolve => {
          finish = () => resolve({ status: 200, body: MEASUREMENT });
        }),
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Take photo', SEND, 'Analyse photo');
    await press(screen, 'Retake');
    await act(async () => finish());
    expect(text(screen)).not.toContain('Estimated image-plane angle');
    expect(fixture.captures[0].release).toHaveBeenCalledTimes(1);
    expect(fixture.preview.active).toBe(true);
    await act(async () => screen.unmount());
  });

  it('releases a late photo when the camera was stopped meanwhile', async () => {
    let finish!: (capture: MediaCapture) => void;
    const late = photo({ uri: 'late:image' });
    const fixture = setup({
      camera: {
        snapshot: () =>
          new Promise(resolve => {
            finish = resolve;
          }),
      },
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Take photo', 'Stop camera');
    await act(async () => finish(late));
    expect(has(screen, 'Captured photo')).toBe(false);
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(fixture.preview.active).toBe(false);
    await act(async () => screen.unmount());
  });

  it('shows a denied camera permission and lets you start again', async () => {
    const fixture = setup({ denied: 'Camera permission denied' });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera');
    expect(text(screen)).toContain('Camera permission denied');
    expect(fixture.preview.active).toBe(false);
    expect(control(screen, 'Start camera')).toBeDefined();
    expect(fixture.requests).toHaveLength(0);
    await act(async () => screen.unmount());
  });

  it('keeps the preview through a permission dialog, and stops in the background', async () => {
    const listener = appState();
    const fixture = setup();
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera');
    await act(async () => listener.change?.('inactive'));
    expect(fixture.preview.active).toBe(true);
    await act(async () => listener.change?.('background'));
    expect(fixture.preview.active).toBe(false);
    await act(async () => screen.unmount());
  });

  it('stops a recording and releases the clip when the app goes to the background', async () => {
    useFakeTimers();
    const listener = appState();
    const release = jest.fn();
    let recording = false;
    const fixture = setup({
      camera: {
        startRecording: async () => {
          recording = true;
        },
        stopRecording: async () => {
          recording = false;
          return photo({ kind: 'video', uri: 'blob:clip', release });
        },
      },
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', 'Record clip');
    expect(recording).toBe(true);
    await act(async () => listener.change?.('background'));
    expect(recording).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
    expect(fixture.preview.active).toBe(false);
    await act(async () => screen.unmount());
  });

  it('goes live only after consent, waits for each answer, and closes on leaving', async () => {
    useFakeTimers();
    const live = socket();
    const fixture = setup({
      live: live.transport,
      camera: {
        snapshot: async () =>
          photo({ bytes: new Uint8Array([255, 216, 255, 217]) }),
      },
    });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera');
    expect(control(screen, 'Go live').props.disabled).toBe(true);
    await press(screen, 'Go live');
    expect(fixture.requests).toHaveLength(0);

    await press(screen, SEND, 'Go live');
    expect(fixture.requests).toEqual([
      { url: 'ws://server.test/v1/pose/stream', method: 'WS', body: null },
    ]);
    await act(async () => {
      live.transport.onopen?.();
      live.transport.onmessage?.({
        data: JSON.stringify({
          type: 'ready',
          max_frame_bytes: 1000,
          max_duration_ms: 60_000,
        }),
      });
    });
    expect(JSON.parse(live.sent[0] as string)).toEqual({
      type: 'start',
      token: 'secret',
      upload_consent: true,
    });
    const frame = JSON.parse(live.sent[1] as string);
    expect(live.sent).toHaveLength(3); // start, frame header, JPEG bytes
    await act(async () =>
      live.transport.onmessage?.({
        data: JSON.stringify({
          ...MEASUREMENT,
          type: 'result',
          timestamp_ms: frame.timestamp_ms,
        }),
      }),
    );
    expect(has(screen, '1 of 1 usable')).toBe(true);
    expect(text(screen)).toContain('Estimated image-plane angle: 92');
    expect(control(screen, 'Save result').props.disabled).toBe(true);

    await act(async () => screen.unmount());
    expect(live.state.closed).toBe(true);
    const count = live.sent.length;
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(live.sent).toHaveLength(count);
  });

  it('stops sending live frames when consent is taken back', async () => {
    const live = socket();
    const fixture = setup({ live: live.transport });
    const screen = await render(fixture, 'Assessment');
    await press(screen, 'Start camera', SEND, 'Go live');
    expect(control(screen, 'Stop live')).toBeDefined();
    await press(screen, SEND);
    expect(live.state.closed).toBe(true);
    expect(control(screen, 'Go live')).toBeDefined();
    await act(async () => screen.unmount());
  });
});

describe('hand photo journal', () => {
  it('saves a reviewed photo with its details only after consent', async () => {
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
    expect(control(screen, 'Save to journal').props.disabled).toBe(true);
    await press(screen, 'Save to journal');
    expect(fixture.requests).toHaveLength(0);

    await press(screen, HAND_CONSENT, 'Save to journal');
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
    await press(screen, 'Start camera', 'Take photo', HAND_CONSENT);
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
    await press(
      screen,
      'Photo of the palm',
      'Pain 3',
      HAND_CONSENT,
      'Save to journal',
    );
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
    await press(screen, HAND_CONSENT, 'Save to journal');
    expect(text(screen)).toContain('Journal could not be saved');
    expect(fixture.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      'POST /v1/me/photos',
      'POST /v1/me/hands',
      'DELETE /v1/me/photos/photo-1',
    ]);
    await act(async () => screen.unmount());
  });
});
