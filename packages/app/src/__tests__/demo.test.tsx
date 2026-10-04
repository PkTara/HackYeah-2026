import ReactTestRenderer, { act } from 'react-test-renderer';
import { emptyGame, type GameState } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';
import { setup } from '../testing/cameraFixture';
import { demoStorage } from '../demo/settings';

type Renderer = ReactTestRenderer.ReactTestRenderer;
const capabilities = (): Capabilities => ({
  platform: 'web',
  platformLabel: 'Test browser',
  haptics: { isAvailable: false, tap: () => {} },
  storage: createMemoryStore(),
});

it('reset also clears an edited non-sample demo profile and survives reopening', async () => {
  const c = capabilities();
  let screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(
    screen,
    'Sample profile, Example climbs, hand flags, tests and 40 XP.',
  );
  await press(screen, 'Close demo controls');
  await press(screen, 'Do dead hang');
  await press(screen, 'Use demo result');
  await press(screen, 'Save result');
  expect(text(screen)).toContain('35 s');
  await press(screen, 'Demo controls');
  await press(screen, 'Reset demo');
  await press(screen, 'Close demo controls');
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
  await press(screen, 'Close demo controls');
  await press(screen, 'Hands');
  await press(screen, 'Add a photo');
  await press(screen, 'Start camera');
  await press(screen, 'Take photo');
  await press(screen, 'Left hand');
  await press(screen, 'Photo of the palm');
  await press(screen, 'Index finger');
  await press(screen, 'Pain 3');
  await press(
    screen,
    'Upload and keep, I agree to keep this entry in the demo journal. Photo storage is simulated.',
  );
  await press(screen, 'Save to journal');
  await press(screen, 'Hands');
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
  await press(screen, 'Close demo controls');
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
  await press(screen, 'Tests');
  await press(screen, 'Demo controls');
  await press(screen, 'Reset demo');
  await press(screen, 'Close demo controls');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('Lvl 1');
  expect(await c.storage.getItem('climbing-monkey/game/v1')).toBeNull();
  await act(async () => screen.unmount());
});

it('offers labelled previews for unavailable tests and hides them when unticked', async () => {
  const screen = await render(capabilities());
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Close demo controls');
  await press(screen, 'Preview Shoulder reach');
  expect(text(screen)).toContain('Left 165°, right 160°');
  expect(text(screen)).toContain('Simulated preview');
  await press(screen, 'Demo controls');
  await press(
    screen,
    'Unavailable tests, Show simulated previews for tests that need hardware or unfinished features.',
  );
  await press(screen, 'Close demo controls');
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
  await press(screen, 'Close demo controls');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('No climbs logged yet.');
  await press(screen, 'Tests');
  await press(screen, 'Demo controls');
  await press(
    screen,
    'Sample profile, Example climbs, hand flags, tests and 40 XP.',
  );
  await press(screen, 'Close demo controls');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('V4');
  await act(async () => screen.unmount());
});

it('switches simulated integration feeds independently and keeps them out of normal mode', async () => {
  const screen = await render(capabilities());
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Close demo controls');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('Strava: Bouldering, 60 min');
  expect(text(screen)).toContain('Apple Health: Sleep, 7 h 45 min');
  await press(screen, 'Tests');
  await press(screen, 'Demo controls');
  await press(screen, 'Strava, Simulate workouts.');
  await press(screen, 'Close demo controls');
  await press(screen, 'Profile');
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

it('demonstrates photo analysis and saving without a server or webcam', async () => {
  const c = capabilities();
  const screen = await render(c);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Close demo controls');
  await press(screen, 'Camera assessment');
  await press(screen, 'Start camera');
  expect(text(screen)).toContain('Simulated camera');
  await press(screen, 'Take photo');
  await press(
    screen,
    'Send for analysis, I agree to simulate this capture locally.',
  );
  await press(screen, 'Analyse photo');
  expect(text(screen)).toContain('Estimated image-plane angle: 92 degrees');
  expect(text(screen)).toContain('Simulated result');
  expect(text(screen)).toContain('No capture is uploaded');
  await press(
    screen,
    'I have reviewed it, Keep this simulated result in the demo profile',
  );
  await press(screen, 'Save result');
  expect(text(screen)).toContain('Saved');
  expect(await c.storage.getItem('media/assessments')).toBeNull();
  const saved = JSON.parse(
    (await c.storage.getItem('climbing-monkey/demo/v1/media/assessments')) ??
      '[]',
  );
  expect(saved[0]).toMatchObject({ value: 92, simulated: true });
  await act(async () => screen.unmount());
});

it('uses the real camera while keeping analysis simulated when webcam mocking is unticked', async () => {
  const fixture = setup();
  const screen = await render(fixture.capabilities);
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(
    screen,
    'Webcam input, Use an animated sample instead of the real camera.',
  );
  await press(screen, 'Close demo controls');
  await press(screen, 'Camera assessment');
  await press(screen, 'Start camera');
  expect(fixture.preview.active).toBe(true);
  expect(text(screen)).not.toContain('Simulated camera');
  await press(screen, 'Take photo');
  expect(text(screen)).toContain('Captured photo');
  await press(
    screen,
    'Send for analysis, I agree to simulate this capture locally.',
  );
  await press(screen, 'Analyse photo');
  expect(text(screen)).toContain('Estimated image-plane angle: 92 degrees');
  expect(fixture.requests).toEqual([]);
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
  await press(screen, 'Close demo controls');
  await press(screen, 'Profile');
  expect(text(screen)).toContain('Demo');
  expect(text(screen)).toContain('V4');
  await act(async () => screen.unmount());
  screen = await render(c);
  await press(screen, 'Profile');
  expect(text(screen)).toContain('V4');
  await press(screen, 'Tests');
  await press(screen, 'Demo controls');
  await press(screen, 'Demo mode, Use a separate demo profile.');
  await press(screen, 'Close demo controls');
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
  await press(screen, 'Close demo controls');
  expect(text(screen)).toContain('Home tests');
  await act(async () => screen.unmount());
});
