import ReactTestRenderer, { act } from 'react-test-renderer';
import { sampleGame, type GameState } from '@hackyeah/core';
import {
  MODE_STORAGE_KEY,
  createLocalBackend,
  sportStorageKey,
} from '@hackyeah/data';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';

const SET_UP: GameState = { ...sampleGame, onboardingSkipped: true };

function createFakeCapabilities(): Capabilities {
  return {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: true, tap: jest.fn() },
    storage: createMemoryStore(),
  };
}

type Renderer = ReactTestRenderer.ReactTestRenderer;

function press(renderer: Renderer, ...labels: string[]) {
  for (const label of labels) {
    const target = renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel === label,
    );
    act(() => target.props.onPress());
  }
}

/** Lets pending saves finish inside act. */
const settle = () => act(async () => {});

const screenText = (renderer: Renderer) => JSON.stringify(renderer.toJSON());

async function renderApp(capabilities = createFakeCapabilities()) {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <App
        capabilities={capabilities}
        backend={createLocalBackend(capabilities.storage, SET_UP)}
        today="2026-10-03"
      />,
    );
  });
  return renderer;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('gazelle mode', () => {
  it('switches from the monkey profile to the gazelle profile and back', async () => {
    const renderer = await renderApp();
    expect(screenText(renderer)).toContain('Quiet feet');

    press(renderer, 'Switch to gazelle mode');
    const text = screenText(renderer);
    expect(text).toContain('Even splits'); // tempo is the sample focus
    expect(text).toContain('Tempo');
    expect(text).not.toContain('Quiet feet');

    press(renderer, 'Switch to monkey mode');
    expect(screenText(renderer)).toContain('Quiet feet');
    act(() => renderer.unmount());
  });

  it('remembers the mode and levels the gazelle on its own XP', async () => {
    const capabilities = createFakeCapabilities();
    const renderer = await renderApp(capabilities);
    press(renderer, 'Switch to gazelle mode');

    // The sample starts the gazelle at 20 XP. Both tempo quests make 40.
    press(renderer, 'Done', 'Done');
    await settle();
    expect(screenText(renderer)).toContain('Nothing left for this focus');
    act(() => renderer.unmount());

    expect(await capabilities.storage.getItem(MODE_STORAGE_KEY)).toBe(
      'gazelle',
    );
    const saved = JSON.parse(
      (await capabilities.storage.getItem(sportStorageKey('run'))) ?? '{}',
    );
    expect(saved.completed).toEqual([
      'sample-run-first-log',
      'sample-run-shoes',
      'tempo-even-splits',
      'tempo-marker',
    ]);

    // Reopens in gazelle mode; the monkey's quest is still waiting.
    const again = await renderApp(capabilities);
    expect(screenText(again)).toContain('Running');
    press(again, 'Switch to monkey mode');
    expect(screenText(again)).toContain('Quiet feet');
    act(() => again.unmount());
  });

  it('logs a run from the Log tab', async () => {
    const renderer = await renderApp();
    press(renderer, 'Switch to gazelle mode', 'Log');
    press(renderer, 'Easy', 'Trail', '5 km', '30 min', 'Finished', 'Save run');
    await settle();
    expect(screenText(renderer)).toContain('Saved: ');
    expect(screenText(renderer)).toContain('6:00 /km');
    act(() => renderer.unmount());
  });

  it('pauses running quests while a leg is flagged', async () => {
    const renderer = await renderApp();
    press(renderer, 'Switch to gazelle mode', 'Legs', 'Left knee', 'Profile');
    await settle();
    const text = screenText(renderer);
    expect(text).toContain('Leg check-in');
    expect(text).toContain('Paused');
    act(() => renderer.unmount());
  });
});

describe('dolphin mode', () => {
  it('switches to the dolphin from the monkey and from the gazelle', async () => {
    const renderer = await renderApp();
    press(renderer, 'Switch to dolphin mode');
    let text = screenText(renderer);
    expect(text).toContain('Still head'); // backstroke is the sample focus
    expect(text).toContain('Back');
    expect(text).not.toContain('Quiet feet');

    press(renderer, 'Switch to gazelle mode');
    expect(screenText(renderer)).toContain('Even splits');
    press(renderer, 'Switch to dolphin mode');
    text = screenText(renderer);
    expect(text).toContain('Still head');
    act(() => renderer.unmount());
  });

  it('levels the dolphin on its own XP and unlocks the swim cap', async () => {
    const capabilities = createFakeCapabilities();
    const renderer = await renderApp(capabilities);
    press(renderer, 'Switch to dolphin mode');

    // The sample starts the dolphin at 30 XP. Two quests reach level 2.
    press(renderer, 'Done');
    press(renderer, 'Done');
    expect(screenText(renderer)).toContain('swim cap');
    press(renderer, 'Nice');
    await settle();
    expect(screenText(renderer)).toContain('Lvl 2');
    act(() => renderer.unmount());

    const swim = JSON.parse(
      (await capabilities.storage.getItem(sportStorageKey('swim'))) ?? '{}',
    );
    expect(swim.completed).toContain('back-still-head');
    // The gazelle has not moved.
    expect(
      await capabilities.storage.getItem(sportStorageKey('run')),
    ).toBeNull();
  });

  it('logs a swim with pace per 100 m', async () => {
    const renderer = await renderApp();
    press(renderer, 'Switch to dolphin mode', 'Log');
    press(
      renderer,
      'Free',
      'Pool',
      '1000 m',
      '25 min',
      'Finished',
      'Save swim',
    );
    await settle();
    expect(screenText(renderer)).toContain('2:30 /100 m');
    act(() => renderer.unmount());
  });

  it('pauses swimming quests while a shoulder is flagged', async () => {
    const renderer = await renderApp();
    press(
      renderer,
      'Switch to dolphin mode',
      'Body',
      'Right shoulder',
      'Profile',
    );
    await settle();
    const text = screenText(renderer);
    expect(text).toContain('Body check-in');
    expect(text).toContain('Paused');
    act(() => renderer.unmount());
  });
});
