import ReactTestRenderer, { act } from 'react-test-renderer';
import { emptyGame, type GameState } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';
import { setup } from '../testing/cameraFixture';
import { demoStorage } from '../demo/settings';

type Renderer = ReactTestRenderer.ReactTestRenderer;
const capabilities = (): Capabilities => {
  const storage = createMemoryStore();
  storage.setItem(
    'climbing-monkey/privacy/v1',
    JSON.stringify({ cameraAnalysis: true, handPhotos: true }),
  );
  return {
    platform: 'web',
    platformLabel: 'Test browser',
    haptics: { isAvailable: false, tap: () => {} },
    storage,
  };
};

it('reset also clears an edited non-sample demo profile and survives reopening', async () => {
  const c = capabilities();
  let screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(
    screen,
    'Sample profile, Example climbs, hand flags, tests and 40 XP.',
  );
  await press(screen, 'Back to Data');
  await press(screen, 'Do dead hang');
  await press(screen, 'Use demo result');
  await press(screen, 'Save result');
  // The test page stays to say what was saved; Done returns to Data.
  expect(text(screen)).toContain('Saved 35 s');
  await press(screen, 'Done, return to Data');
  expect(text(screen)).toContain('35 s');
  await press(screen, 'Demo controls');
  await press(screen, 'Reset demo');
  await press(screen, 'Back to Data');
  expect(text(screen)).not.toContain('35 s');
  await act(async () => screen.unmount());
  screen = await render(c);
  expect(text(screen)).not.toContain('35 s');
  await act(async () => screen.unmount());
});

it('saves a simulated hand journal entry, updates its finger flag and shows the retained entry', async () => {
  const c = capabilities();
  const screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Hands');
  await press(screen, 'Add a photo');
  await press(screen, 'Start camera');
  await press(screen, 'Take photo');
  await press(screen, 'Left hand');
  await press(screen, 'Photo of the palm');
  await press(screen, 'Index finger');
  await press(screen, 'Pain 3');
  await press(screen, 'Save to journal');
  await press(screen, 'Hands');
  await act(async () => {});
  await press(screen, 'Show demo entries');
  expect(text(screen)).toContain('Left index finger: pain 3');
  const saved = await createLocalBackend(demoStorage(c.storage)).load();
  expect(saved.flags).toContainEqual(
    expect.objectContaining({ side: 'left', finger: 'index' }),
  );
  expect(await c.storage.getItem('media/hands')).toBeNull();
  await act(async () => screen.unmount());
});

it('lets a home test use a simulated result and resets saved demo changes for the next presentation', async () => {
  const c = capabilities();
  const screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Redo dead hang');
  await press(screen, 'Use demo result');
  await press(screen, 'Save result');
  const saved = JSON.parse(
    (await c.storage.getItem(
      'climbing-monkey/demo/v1/climbing-monkey/game/v1',
    )) ?? '{}',
  );
  expect(
    saved.baseline.find((r: { testId: string }) => r.testId === 'dead-hang')
      .value,
  ).toBe(35);
  await press(screen, 'Profile');
  await press(screen, 'Done');
  await press(screen, 'Nice');
  expect(text(screen)).toContain('Lvl 2');
  await press(screen, 'Data');
  await press(screen, 'Demo controls');
  await press(screen, 'Reset demo');
  await press(screen, 'Back to Data');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('Lvl 1');
  expect(await c.storage.getItem('climbing-monkey/game/v1')).toBeNull();
  await act(async () => screen.unmount());
});

it('records actual shoulder and instrument features in the isolated demo profile', async () => {
  const c = capabilities();
  const screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Open shoulder reach');
  await press(screen, 'Shoulder reach assessment');
  await press(screen, 'Record');
  await advanceFrames(9);
  expect(text(screen)).toContain('Review your result: Left 170° · Right 170°');
  await press(screen, 'Save result');
  await press(screen, 'Back to Data');
  await press(screen, 'Open finger strength');
  await press(screen, 'Record finger strength');
  await press(screen, 'Fill example reading');
  await press(screen, 'Review result');
  expect(text(screen)).toContain('320 newtons');
  await press(screen, 'Save result');
  const saved = await createLocalBackend(demoStorage(c.storage)).load();
  expect(saved.assessments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        metric: 'shoulder_reach_left',
        value: 170,
        side: 'left',
        simulated: true,
      }),
      expect.objectContaining({
        metric: 'shoulder_reach_right',
        value: 170,
        side: 'right',
        simulated: true,
      }),
      expect.objectContaining({
        metric: 'finger_force',
        value: 320,
        unit: 'N',
        method: 'manual',
        simulated: true,
        setup: {
          instrument: 'Demo load cell',
          grip: 'half_crimp',
          edge_mm: 20,
          arm_position: 'straight',
          effort_seconds: 5,
        },
      }),
    ]),
  );
  expect(
    (await createLocalBackend(c.storage, emptyGame).load()).assessments,
  ).toEqual([]);
  await press(screen, 'Back to Data');
  await press(screen, 'Demo controls');
  expect(text(screen)).not.toContain('Unavailable tests');
  await press(
    screen,
    'Manual assessment examples, Offer example home-test and instrument-force results.',
  );
  await press(screen, 'Back to Data');
  await press(screen, 'Open finger strength');
  await press(screen, 'Record finger strength');
  expect(text(screen)).not.toContain('Fill example reading');
  await press(screen, 'Back to Data');
  expect(text(screen)).toContain('Open shoulder reach');
  expect(text(screen)).not.toContain('Preview Shoulder reach');
  await act(async () => screen.unmount());
});

it('unticking sample profile uses an empty isolated profile offline and restores the sample when reticked', async () => {
  const screen = await render(capabilities());
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(
    screen,
    'Sample profile, Example climbs, hand flags, tests and 40 XP.',
  );
  await press(screen, 'Back to Data');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('No climbs logged yet.');
  await press(screen, 'Data');
  await press(screen, 'Demo controls');
  await press(
    screen,
    'Sample profile, Example climbs, hand flags, tests and 40 XP.',
  );
  await press(screen, 'Back to Data');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('V4');
  await act(async () => screen.unmount());
});

it('switches simulated integration feeds independently and keeps them out of normal mode', async () => {
  const screen = await render(capabilities());
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Open activity and integrations');
  expect(text(screen)).toContain('Strava: Bouldering, 60 min');
  expect(text(screen)).toContain('Apple Health: Sleep, 7 h 45 min');
  await press(screen, 'Data');
  await press(screen, 'Demo controls');
  await press(screen, 'Strava, Simulate workouts.');
  await press(screen, 'Back to Data');
  await press(screen, 'Open activity and integrations');
  expect(text(screen)).not.toContain('Strava: Bouldering, 60 min');
  expect(text(screen)).toContain('Apple Health: Sleep, 7 h 45 min');
  await act(async () => screen.unmount());
});
async function press(screen: Renderer, label: string) {
  const target = screen.root.find(
    n =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityLabel === label,
  );
  await act(async () => target.props.onPress());
}
const text = (screen: Renderer) => {
  const visit = (
    node: ReactTestRenderer.ReactTestRendererJSON | string,
  ): string =>
    typeof node === 'string'
      ? node
      : [
          node.props.accessibilityLabel ?? '',
          ...(node.children ?? []).map(visit),
        ].join('');
  const tree = screen.toJSON();
  return (Array.isArray(tree) ? tree : tree ? [tree] : [])
    .map(visit)
    .join('\n');
};
beforeEach(() =>
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'clearImmediate'] }),
);
afterEach(() => jest.useRealTimers());

async function advanceFrames(count: number) {
  for (let i = 0; i < count; i++) {
    await act(async () => jest.advanceTimersByTime(500));
  }
}

it('demonstrates live recording and reviewed saving without a server or webcam', async () => {
  const c = capabilities();
  const screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Open leg spread');
  await press(screen, 'Leg spread assessment');
  await press(screen, 'Record');
  expect(text(screen)).toContain('Simulated camera');
  expect(text(screen)).toContain('Simulated analysis');
  await advanceFrames(5);
  expect(text(screen)).toContain('Review your result: 91°');
  await press(screen, 'Save result');
  expect(text(screen)).toContain('Saved simulated result to your demo profile');
  expect(await c.storage.getItem('media/assessments')).toBeNull();
  const saved = await createLocalBackend(demoStorage(c.storage)).load();
  expect(saved.assessments).toContainEqual(
    expect.objectContaining({
      metric: 'leg_spread',
      value: 91,
      simulated: true,
      method: 'camera',
    }),
  );
  expect(
    (await createLocalBackend(c.storage, emptyGame).load()).assessments,
  ).toEqual([]);
  await act(async () => screen.unmount());
});

it('uses the real camera while keeping live analysis simulated when webcam mocking is unticked', async () => {
  const fixture = setup();
  const screen = await render(fixture.capabilities);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(
    screen,
    'Webcam input, Use an animated sample instead of the real camera.',
  );
  await press(screen, 'Back to Data');
  await press(screen, 'Open leg spread');
  await press(screen, 'Leg spread assessment');
  await press(screen, 'Record');
  expect(fixture.preview.active).toBe(true);
  expect(text(screen)).not.toContain('Simulated camera');
  expect(text(screen)).toContain('Simulated analysis');
  await advanceFrames(5);
  expect(text(screen)).toContain('Review your result: 91°');
  expect(fixture.preview.active).toBe(false);
  expect(fixture.requests).toEqual([]);
  await act(async () => screen.unmount());
});

it('entering demo mode does not grant either missing privacy preference', async () => {
  const c = capabilities();
  await c.storage.removeItem('climbing-monkey/privacy/v1');
  const screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Open leg spread');
  await press(screen, 'Leg spread assessment');
  const record = screen.root.find(
    n =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityLabel === 'Record',
  );
  expect(record.props.disabled).toBe(true);
  await press(screen, 'Record');
  expect(text(screen)).toContain('Allow live camera analysis in Settings');
  expect(await c.storage.getItem('climbing-monkey/privacy/v1')).toBeNull();
  await act(async () => screen.unmount());
});

async function render(
  c: Capabilities,
  seed: GameState = { ...emptyGame, onboardingSkipped: true },
) {
  let screen!: Renderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <App
        capabilities={c}
        backend={createLocalBackend(c.storage, seed)}
        initialRoute="Tests"
        today="2026-10-04"
      />,
    );
  });
  return screen;
}

it('enables a populated demo without changing the real profile, and remembers the mode', async () => {
  const c = capabilities();
  let screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('Demo');
  expect(text(screen)).toContain('V4');
  await act(async () => screen.unmount());
  screen = await render(c);
  await press(screen, 'Profile');
  expect(text(screen)).toContain('V4');
  await press(screen, 'Data');
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Data');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('No climbs logged yet.');
  const real = await createLocalBackend(c.storage, emptyGame).load();
  expect(real.logs).toEqual([]);
  expect(real.completed).toEqual([]);
  await act(async () => screen.unmount());
});

it('can enter demo mode on first launch before doing onboarding', async () => {
  const screen = await render(capabilities(), emptyGame);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Back to Setup');
  expect(text(screen)).toContain('A few quick questions');
  await press(screen, 'Skip setup');
  expect(text(screen)).toContain('Home tests');
  await act(async () => screen.unmount());
});
