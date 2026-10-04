import ReactTestRenderer, { act } from 'react-test-renderer';
import { emptyGame, sampleGame, type GameState } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import {
  createMemoryStore,
  type Capabilities,
  type MusicCapability,
} from '@hackyeah/platform';
import { App } from '../App';
import { MUSIC_KEY } from '../music';

const SET_UP: GameState = { ...sampleGame, onboardingSkipped: true };

type Renderer = ReactTestRenderer.ReactTestRenderer;

/** A music player that records calls and lets the test fire a "gesture". */
function fakeMusic() {
  let waiting: (() => void) | null = null;
  const music = {
    playing: false,
    play: jest.fn(async () => {
      music.playing = true;
    }),
    stop: jest.fn(() => {
      music.playing = false;
    }),
    onNextGesture: jest.fn((listener: () => void) => {
      waiting = listener;
      return () => {
        waiting = null;
      };
    }),
    gesture() {
      const run = waiting;
      waiting = null;
      run?.();
    },
    get waiting() {
      return waiting !== null;
    },
  };
  return music;
}

function capabilities(music?: MusicCapability): Capabilities {
  return {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: false, tap: () => {} },
    storage: createMemoryStore(),
    music,
  };
}

async function renderApp(caps: Capabilities, state: GameState = SET_UP) {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <App
        capabilities={caps}
        backend={createLocalBackend(caps.storage, state)}
        today="2026-10-03"
      />,
    );
  });
  return renderer;
}

/** Pressable buttons with this accessibility label. */
function buttons(renderer: Renderer, label: string) {
  return renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === label,
  );
}

function pressMusic(renderer: Renderer, label: string) {
  const [button] = buttons(renderer, label);
  expect(button).toBeDefined();
  act(() => button.props.onPress());
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('music button', () => {
  it('is not there when the platform has no music', async () => {
    const renderer = await renderApp(capabilities());
    expect(buttons(renderer, 'Play music')).toHaveLength(0);
    expect(buttons(renderer, 'Mute music')).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('starts off and plays nothing until pressed', async () => {
    const music = fakeMusic();
    const renderer = await renderApp(capabilities(music));
    const [button] = buttons(renderer, 'Play music');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityState).toEqual({ selected: false });
    expect(music.play).not.toHaveBeenCalled();
    expect(music.onNextGesture).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('plays and mutes, flips its label and remembers the choice', async () => {
    const music = fakeMusic();
    const caps = capabilities(music);
    const renderer = await renderApp(caps);

    pressMusic(renderer, 'Play music');
    expect(music.play).toHaveBeenCalledTimes(1);
    const [on] = buttons(renderer, 'Mute music');
    expect(on.props.accessibilityState).toEqual({ selected: true });
    await act(async () => {});
    expect(await caps.storage.getItem(MUSIC_KEY)).toBe('on');

    pressMusic(renderer, 'Mute music');
    expect(music.stop).toHaveBeenCalledTimes(1);
    expect(buttons(renderer, 'Play music')).toHaveLength(1);
    await act(async () => {});
    expect(await caps.storage.getItem(MUSIC_KEY)).toBe('off');
    act(() => renderer.unmount());
  });

  it('keeps playing across screens', async () => {
    const music = fakeMusic();
    const renderer = await renderApp(capabilities(music));
    pressMusic(renderer, 'Play music');
    const tab = renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel === 'Hands',
    );
    act(() => tab.props.onPress());
    expect(buttons(renderer, 'Mute music')).toHaveLength(1);
    expect(music.stop).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('when left on, waits for the first gesture before playing', async () => {
    const music = fakeMusic();
    const caps = capabilities(music);
    await caps.storage.setItem(MUSIC_KEY, 'on');
    const renderer = await renderApp(caps);

    expect(buttons(renderer, 'Mute music')).toHaveLength(1);
    expect(music.play).not.toHaveBeenCalled();
    expect(music.waiting).toBe(true);

    act(() => music.gesture());
    expect(music.play).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('muting before the first gesture cancels the wait', async () => {
    const music = fakeMusic();
    const caps = capabilities(music);
    await caps.storage.setItem(MUSIC_KEY, 'on');
    const renderer = await renderApp(caps);

    pressMusic(renderer, 'Mute music');
    expect(music.waiting).toBe(false);
    expect(music.play).not.toHaveBeenCalled();
    expect(buttons(renderer, 'Play music')).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('is on the setup screens too', async () => {
    const music = fakeMusic();
    const renderer = await renderApp(capabilities(music), emptyGame);
    expect(JSON.stringify(renderer.toJSON())).toContain('Climbing Monkey');
    expect(buttons(renderer, 'Play music')).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('stops the music when the app goes away', async () => {
    const music = fakeMusic();
    const renderer = await renderApp(capabilities(music));
    pressMusic(renderer, 'Play music');
    act(() => renderer.unmount());
    expect(music.stop).toHaveBeenCalled();
  });
});
