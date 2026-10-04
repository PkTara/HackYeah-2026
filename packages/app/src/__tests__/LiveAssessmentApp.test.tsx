import { act } from 'react-test-renderer';
import { createLocalBackend } from '@hackyeah/data';
import {
  MEASUREMENT,
  control,
  has,
  photo,
  press,
  render,
  setup,
  socket,
  useFakeTimers,
} from '../testing/cameraFixture';
import { shoulder } from '../testing/livePoseFixture';

afterEach(() => jest.useRealTimers());

it('records a live measurement using saved permission, auto-stops and saves it into profile history', async () => {
  useFakeTimers();
  const stream = socket();
  const fixture = setup({
    live: stream.transport,
    camera: {
      snapshot: async () => photo({ bytes: new Uint8Array([1, 2, 3]) }),
    },
  });
  await fixture.capabilities.storage.setItem(
    'climbing-monkey/privacy/v1',
    JSON.stringify({ cameraAnalysis: true, handPhotos: false }),
  );
  const screen = await render(fixture, 'Tests');
  await press(screen, 'Open leg spread');
  await press(screen, 'Leg spread assessment');
  expect(fixture.preview.active).toBe(false);
  await press(screen, 'Record');
  await act(async () => {
    stream.transport.onopen?.();
    stream.transport.onmessage?.({
      data: JSON.stringify({
        type: 'ready',
        max_frame_bytes: 8192,
        max_duration_ms: 60000,
      }),
    });
  });
  expect(JSON.parse(stream.sent[0] as string)).toMatchObject({
    type: 'start',
    upload_consent: true,
    metric: 'leg_spread',
  });
  for (let i = 0; i < 5; i++) {
    await act(async () =>
      stream.transport.onmessage?.({
        data: JSON.stringify({
          type: 'result',
          ...MEASUREMENT,
          landmarks: shoulder(0).landmarks,
          image_width: 640,
          image_height: 480,
          timestamp_ms: i * 500,
        }),
      }),
    );
    if (i < 4) {
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
    }
  }
  expect(stream.state.closed).toBe(true);
  expect(fixture.preview.active).toBe(false);
  expect(has(screen, 'Back to Data')).toBe(true);
  expect(
    control(
      screen,
      'Send for analysis, I consent to sending this capture to the server for analysis.',
    ),
  ).toBeUndefined();
  await press(screen, 'Save result');
  const saved = await createLocalBackend(fixture.capabilities.storage).load();
  expect(saved.assessments).toContainEqual(
    expect.objectContaining({
      metric: 'leg_spread',
      value: 92,
      method: 'camera',
    }),
  );
  await act(async () => screen.unmount());
});

it('uses the separately saved hand-photo permission without asking again for every capture', async () => {
  const fixture = setup();
  await fixture.capabilities.storage.setItem(
    'climbing-monkey/privacy/v1',
    JSON.stringify({ cameraAnalysis: false, handPhotos: true }),
  );
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
  expect(control(screen, 'Save to journal').props.disabled).toBe(false);
  await press(screen, 'Save to journal');
  expect(fixture.requests.map(r => r.url)).toEqual([
    '/v1/me/photos',
    '/v1/me/hands',
  ]);
  await act(async () => screen.unmount());
});
