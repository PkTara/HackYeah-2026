import ReactTestRenderer, { act } from 'react-test-renderer';
import { createLocalBackend, type ClimbingBackend } from '@hackyeah/data';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';

function createFakeCapabilities(): Capabilities {
  return {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: true, tap: jest.fn() },
    storage: createMemoryStore(),
  };
}

type Renderer = ReactTestRenderer.ReactTestRenderer;

/** Finds a pressable by its accessibilityLabel and presses it. */
function press(renderer: Renderer, label: string) {
  const target = renderer.root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  );
  act(() => target.props.onPress());
}

function screenText(renderer: Renderer) {
  return JSON.stringify(renderer.toJSON());
}

async function renderApp(
  capabilities = createFakeCapabilities(),
  backend?: ClimbingBackend,
) {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <App capabilities={capabilities} backend={backend} today="2026-10-03" />,
    );
  });
  return renderer;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('App', () => {
  it('opens on the profile with the focus, quest and monkey level', async () => {
    const renderer = await renderApp();
    const text = screenText(renderer);

    expect(text).toContain('Lvl 1');
    expect(text).toContain('Vertical');
    expect(text).toContain('Quiet feet');
    act(() => renderer.unmount());
  });

  it('levels the monkey up once per quest and saves progress', async () => {
    const capabilities = createFakeCapabilities();
    const renderer = await renderApp(capabilities);

    press(renderer, 'Done');
    expect(screenText(renderer)).toContain('Level 2');
    expect(screenText(renderer)).toContain('banana headband');

    press(renderer, 'Nice');
    expect(screenText(renderer)).toContain('Lvl 2');
    expect(screenText(renderer)).not.toContain('Level up');

    await act(async () => {});
    const saved = JSON.parse(
      (await capabilities.storage.getItem('climbing-monkey/game/v1')) ?? '{}',
    );
    expect(saved.completed).toContain('vertical-quiet-feet');
    act(() => renderer.unmount());
  });

  it('swaps to a different quest', async () => {
    const renderer = await renderApp();

    press(renderer, 'Swap');
    expect(screenText(renderer)).toContain('Read it first');
    act(() => renderer.unmount());
  });

  it('switches tabs from the tab bar', async () => {
    const renderer = await renderApp();

    press(renderer, 'Tests');
    expect(screenText(renderer)).not.toContain('Quiet feet');

    press(renderer, 'Profile');
    expect(screenText(renderer)).toContain('Quiet feet');
    act(() => renderer.unmount());
  });

  it('puts the saved state back and says so when a save fails', async () => {
    const local = createLocalBackend(createMemoryStore());
    const backend: ClimbingBackend = {
      ...local,
      kind: 'remote',
      completeQuest: () => Promise.reject(new Error('server down')),
    };
    const renderer = await renderApp(createFakeCapabilities(), backend);

    press(renderer, 'Done');
    press(renderer, 'Nice');
    await act(async () => {});

    expect(screenText(renderer)).toContain('Could not save that change');
    expect(screenText(renderer)).toContain('Lvl 1');
    act(() => renderer.unmount());
  });
});
