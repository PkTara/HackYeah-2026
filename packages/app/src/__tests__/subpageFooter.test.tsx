import ReactTestRenderer, { act } from 'react-test-renderer';
import { emptyGame } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';

type Renderer = ReactTestRenderer.ReactTestRenderer;
const control = (s: Renderer, label: string) =>
  s.root.find(
    n =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityLabel === label,
  );
const press = async (s: Renderer, label: string) => {
  await act(async () => control(s, label).props.onPress());
};
async function render(initialRoute: 'About' | 'Data') {
  const capabilities: Capabilities = {
    platform: 'web',
    platformLabel: 'Test browser',
    storage: createMemoryStore(),
    haptics: { isAvailable: false, tap: () => {} },
  };
  let s!: Renderer;
  await act(async () => {
    s = ReactTestRenderer.create(
      <App
        capabilities={capabilities}
        backend={createLocalBackend(capabilities.storage, {
          ...emptyGame,
          onboardingSkipped: true,
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

it('provides bottom Done navigation from a directly linked About page to its canonical Data parent', async () => {
  const s = await render('About');
  expect(control(s, 'Back to Data')).toBeDefined();
  await press(s, 'Close');
  expect(control(s, 'Settings')).toBeDefined();
  expect(
    s.root.findAll(n => n.props.accessibilityLabel === 'Close').length,
  ).toBe(0);
  await act(async () => s.unmount());
});

it('returns from About to its Settings context through Done', async () => {
  const s = await render('Data');
  await press(s, 'Settings');
  await press(s, 'About this build');
  await press(s, 'Close');
  expect(
    control(
      s,
      'Live camera analysis, Allow frames to be sent while a camera assessment is recording.',
    ),
  ).toBeDefined();
  await press(s, 'Close');
  expect(control(s, 'Open finger strength')).toBeDefined();
  await act(async () => s.unmount());
});

it('offers a Hands link on an unflagged Profile and keeps finger check-in out of Log', async () => {
  const s = await render('Data');
  await press(s, 'Profile');
  await press(s, 'Open Hands');
  expect(control(s, 'Left thumb')).toBeDefined();
  await press(s, 'Log');
  expect(
    s.root.findAll(n => n.props.accessibilityLabel === 'Check hands').length,
  ).toBe(0);
  await act(async () => s.unmount());
});

it('closes demo controls using the bottom Done action while leaving the Data page visible', async () => {
  const s = await render('Data');
  await press(s, 'Demo controls');
  await press(s, 'Done');
  expect(control(s, 'Settings')).toBeDefined();
  expect(
    s.root.findAll(
      n =>
        n.props.accessibilityLabel ===
        'Demo mode, Use a separate demo profile.',
    ).length,
  ).toBe(0);
  await act(async () => s.unmount());
});
