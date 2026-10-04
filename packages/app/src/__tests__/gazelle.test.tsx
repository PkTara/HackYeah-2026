import ReactTestRenderer, { act } from 'react-test-renderer';
import { sampleGame, type GameState } from '@hackyeah/core';
import {
  MODE_STORAGE_KEY,
  RUN_STORAGE_KEY,
  createLocalBackend,
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
      (await capabilities.storage.getItem(RUN_STORAGE_KEY)) ?? '{}',
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
