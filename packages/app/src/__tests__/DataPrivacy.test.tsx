import ReactTestRenderer, { act } from 'react-test-renderer';
import { emptyGame } from '@hackyeah/core';
import { createLocalBackend, LOCAL_STORAGE_KEY } from '@hackyeah/data';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';
import type { RouteName } from '../navigation/routes';

type Renderer = ReactTestRenderer.ReactTestRenderer;
const CAPS = (): Capabilities => ({
  platform: 'web',
  platformLabel: 'Test browser',
  storage: createMemoryStore(),
  haptics: { isAvailable: false, tap: () => {} },
});
const find = (s: Renderer, label: string) =>
  s.root.find(
    n =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityLabel === label,
  );
const press = async (s: Renderer, label: string) => {
  await act(async () => find(s, label).props.onPress());
};
async function render(
  c: Capabilities,
  firstRun = false,
  initialRoute: RouteName = 'Tests',
) {
  let s!: Renderer;
  await act(async () => {
    s = ReactTestRenderer.create(
      <App
        capabilities={c}
        backend={createLocalBackend(c.storage, {
          ...emptyGame,
          onboardingSkipped: !firstRun,
        })}
        initialRoute={initialRoute}
      />,
    );
  });
  return s;
}
beforeEach(() =>
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'clearImmediate'] }),
);
afterEach(() => jest.useRealTimers());

it('returns to the opening Settings stack after demo dataset remounts', async () => {
  const s = await render(CAPS(), false, 'Profile');
  await press(s, 'Data');
  await press(s, 'Settings');
  await press(s, 'Demo controls');
  await press(s, 'Demo mode, Use a separate demo profile.');
  await press(s, 'Back to Settings');
  expect(find(s, 'Redo setup')).toBeDefined();
  await press(s, 'Back to Data');
  expect(JSON.stringify(s.toJSON())).toContain('Body & reach');
  await act(async () => s.unmount());
});

it('returns to Setup when demo mode replaces the first-run dataset', async () => {
  const c = CAPS();
  const s = await render(c, true);
  const normalBefore = await c.storage.getItem(LOCAL_STORAGE_KEY);
  await press(s, 'Demo controls');
  await press(s, 'Demo mode, Use a separate demo profile.');
  await press(s, 'Back to Setup');
  expect(find(s, 'Start')).toBeDefined();
  expect(
    JSON.parse((await c.storage.getItem('climbing-monkey/privacy/v1')) ?? '{}')
      .cameraAnalysis,
  ).not.toBe(true);
  expect(await c.storage.getItem(LOCAL_STORAGE_KEY)).toBe(normalBefore);
  await act(async () => s.unmount());
});

it.each(['Data', 'Settings', 'About'] as const)(
  'restores the opening %s direct link through every dataset switch',
  async initialRoute => {
    const s = await render(CAPS(), false, initialRoute);
    await press(s, 'Demo controls');
    for (const switchLabel of [
      'Demo mode, Use a separate demo profile.',
      'Sample profile, Example climbs, hand flags, tests and 40 XP.',
      'Webcam input, Use an animated sample instead of the real camera.',
      'Analysis results, Simulate live leg-spread and shoulder measurements.',
      'Hand-photo storage, Simulate saving hand photos and journal entries locally.',
      'Reset demo',
      'Demo mode, Use a separate demo profile.',
    ]) {
      await press(s, switchLabel);
    }
    await press(s, `Back to ${initialRoute}`);
    if (initialRoute === 'Data') {
      expect(JSON.stringify(s.toJSON())).toContain('Body & reach');
    } else {
      expect(find(s, 'Back to Data')).toBeDefined();
      if (initialRoute === 'Settings') {
        expect(find(s, 'Redo setup')).toBeDefined();
      } else {
        expect(JSON.stringify(s.toJSON())).toContain('About');
      }
      await press(s, 'Back to Data');
      expect(JSON.stringify(s.toJSON())).toContain('Body & reach');
    }
    await act(async () => s.unmount());
  },
);

it('restores assessment parameters and the About opening stack after a camera-source change', async () => {
  const s = await render(CAPS(), false, 'Profile');
  await press(s, 'Data');
  await press(s, 'Demo controls');
  await press(s, 'Demo mode, Use a separate demo profile.');
  await press(s, 'Back to Data');
  await press(s, 'Open shoulder reach');
  await press(s, 'Shoulder reach assessment');
  await press(s, 'Settings');
  await press(s, 'About this build');
  expect(find(s, 'Back to Shoulder reach')).toBeDefined();
  await press(s, 'Demo controls');
  await press(
    s,
    'Webcam input, Use an animated sample instead of the real camera.',
  );
  await press(s, 'Back to About');
  await press(s, 'Back to Settings');
  await press(s, 'Back to Shoulder reach');
  expect(JSON.stringify(s.toJSON())).toContain('Shoulder reach');
  await press(s, 'Back to Data');
  expect(JSON.stringify(s.toJSON())).toContain('Body & reach');
  await act(async () => s.unmount());
});

it('offers optional analysis permission at setup and stores an explicit choice', async () => {
  const c = CAPS();
  const s = await render(c, true);
  const choice = find(
    s,
    'Live camera analysis, Allow frames to be sent while a camera assessment is recording.',
  );
  expect(choice.props['aria-checked']).toBe(false);
  await press(
    s,
    'Live camera analysis, Allow frames to be sent while a camera assessment is recording.',
  );
  expect(
    JSON.parse((await c.storage.getItem('climbing-monkey/privacy/v1')) ?? '{}')
      .cameraAnalysis,
  ).toBe(true);
  await act(async () => s.unmount());
});

it('uses breadcrumb navigation in demo controls and setup submenus', async () => {
  const s = await render(CAPS());
  await press(s, 'Settings');
  await press(s, 'Demo controls');
  await press(s, 'Back to Settings');
  expect(
    s.root.findAll(
      n =>
        n.props.accessibilityLabel ===
        'Demo mode, Use a separate demo profile.',
    ).length,
  ).toBe(0);
  await press(s, 'Redo setup');
  await press(s, 'Start');
  await press(s, 'Back to Setup');
  expect(find(s, 'Start')).toBeDefined();
  await act(async () => s.unmount());
});

it('groups Data by purpose and opens Settings with a working breadcrumb and persistent revocation', async () => {
  const c = CAPS();
  await c.storage.setItem(
    'climbing-monkey/privacy/v1',
    JSON.stringify({ cameraAnalysis: true, handPhotos: false }),
  );
  let s = await render(c);
  expect(
    s.root.findAll(n => n.props.accessibilityLabel === 'Data').length,
  ).toBeGreaterThan(0);
  const json = JSON.stringify(s.toJSON());
  for (const section of [
    'Body & reach',
    'Mobility & movement',
    'Strength & endurance',
    'Activity & recovery',
  ]) {
    expect(json.includes(section)).toBe(true);
  }
  await press(s, 'Settings');
  expect(find(s, 'Back to Data')).toBeDefined();
  await press(
    s,
    'Live camera analysis, Allow frames to be sent while a camera assessment is recording.',
  );
  await press(s, 'Back to Data');
  await act(async () => s.unmount());
  s = await render(c);
  await press(s, 'Settings');
  expect(
    find(
      s,
      'Live camera analysis, Allow frames to be sent while a camera assessment is recording.',
    ).props['aria-checked'],
  ).toBe(false);
  await act(async () => s.unmount());
});
