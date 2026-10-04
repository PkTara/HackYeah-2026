import ReactTestRenderer, { act } from 'react-test-renderer';
import { Breadcrumbs } from '@hackyeah/ui';
import { emptyGame } from '@hackyeah/core';
import { createLocalBackend, createLocalSportBackend } from '@hackyeah/data';
import { createMemoryStore } from '@hackyeah/platform';
import { GameProvider } from '../state/GameProvider';
import { SportProvider } from '../state/SportProvider';
import { Navigator } from '../navigation/Navigator';
import { DemoProvider } from '../demo/DemoProvider';
import { DEMO_SETTINGS_KEY, demoDefaults } from '../demo/settings';
import { FingerStrengthScreen } from '../screens/FingerStrengthScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;
const control = (screen: Renderer, label: string) =>
  screen.root.find(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  );
const text = (screen: Renderer) => JSON.stringify(screen.toJSON());
async function press(screen: Renderer, label: string) {
  await act(async () => control(screen, label).props.onPress());
}
async function type(screen: Renderer, label: string, value: string) {
  await act(async () =>
    screen.root
      .find(
        n =>
          n.props.accessibilityLabel === label &&
          typeof n.props.onChangeText === 'function',
      )
      .props.onChangeText(value),
  );
}
async function render(demo = false, persistence?: Promise<void>) {
  const storage = createMemoryStore();
  if (demo) {
    await storage.setItem(
      DEMO_SETTINGS_KEY,
      JSON.stringify({ ...demoDefaults, enabled: true }),
    );
  }
  const gameStorage = createMemoryStore();
  const backend = createLocalBackend(
    persistence
      ? {
          ...gameStorage,
          setItem: async (key, value) => {
            await persistence;
            await gameStorage.setItem(key, value);
          },
        }
      : gameStorage,
    emptyGame,
  );
  let screen!: Renderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <DemoProvider storage={storage}>
        <GameProvider backend={backend}>
          {/* The app always provides runs; the tab bar reads the pet mode. */}
          <SportProvider backend={createLocalSportBackend(createMemoryStore())}>
            <Navigator
              initialRoute="FingerStrength"
              screens={{ FingerStrength: FingerStrengthScreen }}
            />
          </SportProvider>
        </GameProvider>
      </DemoProvider>,
    );
  });
  return { screen, backend };
}

it('requires a positive instrument reading and complete setup before review', async () => {
  const { screen, backend } = await render();
  expect(control(screen, 'Review result').props.disabled).toBe(true);
  expect((await backend.load()).assessments).toEqual([]);
  await act(async () => screen.unmount());
});

async function fill(screen: Renderer) {
  await type(screen, 'Force reading', '400');
  await type(screen, 'Instrument', 'Load cell');
  await type(screen, 'Edge depth in millimetres', '20');
  await type(screen, 'Effort duration in seconds', '5');
  await press(screen, 'Left hand');
  await press(screen, 'Half crimp');
  await press(screen, 'Straight arm');
}

it('reviews validated setup without saving it until the separate save action', async () => {
  const { screen, backend } = await render();
  await fill(screen);
  expect(control(screen, 'Review result').props.disabled).toBe(false);
  await press(screen, 'Review result');
  expect(text(screen)).toContain('400 newtons');
  expect(text(screen)).toContain('Load cell');
  expect(text(screen)).toContain('Review your reading');
  expect((await backend.load()).assessments).toEqual([]);
  await act(async () => screen.unmount());
});

it('saves reviewed force with its unit, side, setup and manual source', async () => {
  const { screen, backend } = await render();
  await fill(screen);
  await press(screen, 'Kilogram-force (kgf)');
  await press(screen, 'Both hands');
  await press(screen, 'Review result');
  await press(screen, 'Save result');
  expect((await backend.load()).assessments).toEqual([
    expect.objectContaining({
      metric: 'finger_force',
      value: 400,
      unit: 'kgf',
      side: 'both',
      method: 'manual',
      simulated: false,
      protocol: 'instrument-finger-force-v1',
      setup: {
        instrument: 'Load cell',
        grip: 'half_crimp',
        edge_mm: 20,
        arm_position: 'straight',
        effort_seconds: 5,
      },
    }),
  ]);
  expect(text(screen)).toContain('Saved to your profile');
  await act(async () => screen.unmount());
});

it('fills an explicit simulated instrument example through the same validation, review and save flow', async () => {
  const { screen, backend } = await render(true);
  await press(screen, 'Fill example reading');
  expect(control(screen, 'Review result').props.disabled).toBe(false);
  expect((await backend.load()).assessments).toEqual([]);
  await type(screen, 'Force reading', '-1');
  expect(control(screen, 'Review result').props.disabled).toBe(true);
  await type(screen, 'Force reading', '320');
  await press(screen, 'Review result');
  expect(text(screen)).toContain('Simulated instrument reading');
  await press(screen, 'Save result');
  expect((await backend.load()).assessments).toEqual([
    expect.objectContaining({
      metric: 'finger_force',
      value: 320,
      simulated: true,
    }),
  ]);
  await act(async () => screen.unmount());
});

it('provides a review breadcrumb back to editing with the typed values retained', async () => {
  const { screen } = await render();
  await fill(screen);
  await press(screen, 'Review result');
  expect(
    screen.root
      .findByType(Breadcrumbs)
      .props.crumbs.map((crumb: { label: string }) => crumb.label),
  ).toEqual(['Data', 'Finger strength', 'Review']);
  await press(screen, 'Back to Finger strength');
  expect(control(screen, 'Review result').props.disabled).toBe(false);
  expect(
    screen.root.find(
      n =>
        n.props.accessibilityLabel === 'Force reading' &&
        typeof n.props.onChangeText === 'function',
    ).props.value,
  ).toBe('400');
  await act(async () => screen.unmount());
});

it('limits instrument input to 120 characters and blocks longer pasted names before review', async () => {
  const { screen, backend } = await render();
  await fill(screen);
  const instrument = screen.root.find(
    n =>
      n.props.accessibilityLabel === 'Instrument' &&
      typeof n.props.onChangeText === 'function',
  );
  expect(instrument.props.maxLength).toBe(120);
  await type(screen, 'Instrument', 'x'.repeat(120));
  expect(control(screen, 'Review result').props.disabled).toBe(false);
  await type(screen, 'Instrument', 'x'.repeat(121));
  expect(control(screen, 'Review result').props.disabled).toBe(true);
  expect((await backend.load()).assessments).toEqual([]);
  await act(async () => screen.unmount());
});

it('keeps the current force review while saving, then allows another review after persistence', async () => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => {
    release = resolve;
  });
  const { screen, backend } = await render(false, pending);
  await fill(screen);
  const beginReview = control(screen, 'Review result').props.onPress;
  await press(screen, 'Review result');
  let save!: Promise<void>;
  await act(async () => {
    save = control(screen, 'Save result').props.onPress();
  });
  expect(control(screen, 'Close').props.disabled).toBe(true);
  await press(screen, 'Close');
  await press(screen, 'Back to Finger strength');
  expect(
    screen.root
      .findByType(Breadcrumbs)
      .props.crumbs.map((crumb: { label: string }) => crumb.label),
  ).toEqual(['Data', 'Finger strength', 'Review']);
  await press(screen, 'Edit reading');
  expect(text(screen)).toContain('Saving…');
  await act(async () => {
    beginReview();
  });
  expect(text(screen)).toContain('Saving…');
  await act(async () => {
    release();
    await save;
  });
  expect(text(screen)).toContain('Saved to your profile');
  expect(control(screen, 'Close').props.disabled).toBe(false);
  await press(screen, 'Close');
  await type(screen, 'Force reading', '410');
  await press(screen, 'Review result');
  expect(control(screen, 'Save result').props.disabled).toBe(false);
  await press(screen, 'Save result');
  expect(
    (await backend.load()).assessments?.map(record => record.value),
  ).toEqual([400, 410]);
  await act(async () => screen.unmount());
});
