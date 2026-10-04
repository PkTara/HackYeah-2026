import ReactTestRenderer, { act } from 'react-test-renderer';
import { sampleGame, type GameState } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import {
  createMemoryStore,
  type Capabilities,
  type SfxCapability,
} from '@hackyeah/platform';
import { App } from '../App';
import type { RouteName } from '../navigation/routes';
import { SFX_KEY } from '../sfx';

const SET_UP: GameState = { ...sampleGame, onboardingSkipped: true };

type Renderer = ReactTestRenderer.ReactTestRenderer;

/** A sound effect player that records what it was asked to play. */
function fakeSfx() {
  const sfx = {
    enabled: true,
    play: jest.fn(),
    setEnabled: jest.fn((on: boolean) => {
      sfx.enabled = on;
    }),
  };
  return sfx;
}

function capabilities(sfx?: SfxCapability): Capabilities {
  return {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: false, tap: () => {} },
    storage: createMemoryStore(),
    sfx,
  };
}

async function renderApp(caps: Capabilities, initialRoute: RouteName = 'Settings') {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <App
        capabilities={caps}
        backend={createLocalBackend(caps.storage, SET_UP)}
        today="2026-10-03"
        initialRoute={initialRoute}
      />,
    );
  });
  return renderer;
}

function soundSwitch(renderer: Renderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'switch' &&
      node.props.accessibilityLabel === 'Sound effects' &&
      typeof node.props.onPress === 'function',
  );
}

function pressLabel(renderer: Renderer, label: string) {
  const [target] = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  );
  expect(target).toBeDefined();
  act(() => target.props.onPress());
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('sound effects switch', () => {
  it('is on by default, on the Settings page, with the ZzFX credit', async () => {
    const sfx = fakeSfx();
    const renderer = await renderApp(capabilities(sfx));
    const [toggle] = soundSwitch(renderer);
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
    expect(JSON.stringify(renderer.toJSON())).toContain(
      'Sound effects made with ZzFX by Frank Force (MIT).',
    );
    expect(sfx.setEnabled).toHaveBeenLastCalledWith(true);
    act(() => renderer.unmount());
  });

  it('keeps the ZzFX credit on the About page', async () => {
    const renderer = await renderApp(capabilities(fakeSfx()), 'About');
    expect(soundSwitch(renderer)).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).toContain(
      'Sound effects made with ZzFX by Frank Force (MIT).',
    );
    act(() => renderer.unmount());
  });

  it('turns off and on, and remembers the choice', async () => {
    const sfx = fakeSfx();
    const caps = capabilities(sfx);
    const renderer = await renderApp(caps);

    act(() => soundSwitch(renderer)[0].props.onPress());
    expect(sfx.setEnabled).toHaveBeenLastCalledWith(false);
    expect(soundSwitch(renderer)[0].props.accessibilityState).toEqual({
      checked: false,
    });
    await act(async () => {});
    expect(await caps.storage.getItem(SFX_KEY)).toBe('off');

    act(() => soundSwitch(renderer)[0].props.onPress());
    expect(sfx.setEnabled).toHaveBeenLastCalledWith(true);
    // The click after turning them on is the first thing heard.
    expect(sfx.play).toHaveBeenLastCalledWith('tap', undefined);
    await act(async () => {});
    expect(await caps.storage.getItem(SFX_KEY)).toBe('on');
    act(() => renderer.unmount());
  });

  it('comes back off after a restart when it was turned off', async () => {
    const caps = capabilities(fakeSfx());
    await caps.storage.setItem(SFX_KEY, 'off');
    const sfx = fakeSfx();
    const renderer = await renderApp({ ...caps, sfx });
    expect(sfx.setEnabled).toHaveBeenCalledWith(false);
    expect(sfx.enabled).toBe(false);
    expect(soundSwitch(renderer)[0].props.accessibilityState).toEqual({
      checked: false,
    });
    act(() => renderer.unmount());
  });

  it('without the capability: no switch, a plain note, and buttons still work', async () => {
    const renderer = await renderApp(capabilities());
    expect(soundSwitch(renderer)).toHaveLength(0);
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Sound effects are not available on this device yet.');
    pressLabel(renderer, 'Hands');
    expect(JSON.stringify(renderer.toJSON())).toContain('Hands');
    act(() => renderer.unmount());
  });
});

describe('sounds in the app', () => {
  it('taps for kit buttons and tabs', async () => {
    const sfx = fakeSfx();
    const renderer = await renderApp(capabilities(sfx), 'Profile');
    sfx.play.mockClear();
    pressLabel(renderer, 'Log');
    expect(sfx.play).toHaveBeenCalledTimes(1);
    expect(sfx.play).toHaveBeenCalledWith('tap', undefined);
    act(() => renderer.unmount());
  });

  it('plays success after a tap when a quest is done', async () => {
    const sfx = fakeSfx();
    const renderer = await renderApp(capabilities(sfx), 'Profile');
    sfx.play.mockClear();
    pressLabel(renderer, 'Done');
    const names = sfx.play.mock.calls.map(([name]) => name);
    expect(names[0]).toBe('tap');
    expect(['success', 'levelUp']).toContain(names[1]);
    act(() => renderer.unmount());
  });
});
