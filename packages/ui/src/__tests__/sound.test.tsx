import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SpeechBubble } from '../components/SpeechBubble';
import { Toggle } from '../components/Toggle';
import { UiSoundContext } from '../sound';

type Renderer = ReactTestRenderer.ReactTestRenderer;

/** Renders `element` with a sound player that records what it was asked for. */
function render(element: ReactElement) {
  const play = jest.fn();
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <UiSoundContext.Provider value={play}>{element}</UiSoundContext.Provider>,
    );
  });
  return { renderer, play };
}

function press(renderer: Renderer, role: string) {
  const [target] = renderer.root.findAll(
    n => n.props.accessibilityRole === role && typeof n.props.onPress === 'function',
  );
  act(() => target.props.onPress());
}

describe('kit control sounds', () => {
  it('Button plays one tap per press, before its action', () => {
    const order: string[] = [];
    const onPress = jest.fn(() => order.push('action'));
    const { renderer, play } = render(<Button title="Save" onPress={onPress} />);
    play.mockImplementation(sound => order.push(sound));
    press(renderer, 'button');
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('tap');
    press(renderer, 'button');
    expect(play).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['tap', 'action', 'tap', 'action']);
  });

  it('a disabled Button makes no sound', () => {
    const { renderer, play } = render(<Button title="Save" onPress={jest.fn()} disabled />);
    const target = renderer.root.find(n => n.props.accessibilityRole === 'button');
    // Pressable never calls onPress while disabled.
    expect(target.props.disabled).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });

  it('Chip ticks brighter when chosen and taps when let go', () => {
    const chosen = render(<Chip label="Crimp" selected={false} onPress={jest.fn()} />);
    press(chosen.renderer, 'button');
    expect(chosen.play).toHaveBeenCalledWith('select');

    const letGo = render(<Chip label="Crimp" selected onPress={jest.fn()} />);
    press(letGo.renderer, 'button');
    expect(letGo.play).toHaveBeenCalledWith('tap');
  });

  it('Toggle is a named switch with its state, and clicks after the change', () => {
    const order: string[] = [];
    const onValueChange = jest.fn((on: boolean) => order.push(`change ${on}`));
    const { renderer, play } = render(
      <Toggle name="Sound effects" value onValueChange={onValueChange} />,
    );
    play.mockImplementation(sound => order.push(sound));
    const target = renderer.root.find(n => n.props.accessibilityRole === 'switch');
    expect(target.props.accessibilityLabel).toBe('Sound effects');
    expect(target.props.accessibilityState).toEqual({ checked: true });
    expect(target.props['aria-checked']).toBe(true);
    press(renderer, 'switch');
    expect(order).toEqual(['change false', 'tap']);
  });

  it('works without a sound provider', () => {
    const onPress = jest.fn();
    let renderer!: Renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Button title="Save" onPress={onPress} />);
    });
    press(renderer, 'button');
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('speech bubble typing murmur', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Motion stays on, and the answer never lands outside act().
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise(() => {}));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /** Runs the typewriter for `ticks` steps of 40 ms. */
  function type(ticks: number) {
    for (let i = 0; i < ticks; i++) {
      act(() => {
        jest.advanceTimersByTime(40);
      });
    }
  }

  it('murmurs about every second letter until the line is out', () => {
    const text = 'Hello climber, ready to go up?';
    const { play } = render(<SpeechBubble text={text} />);
    type(40);
    const letters = text.replace(/[^A-Za-z]/g, '').length;
    expect(play.mock.calls.length).toBeGreaterThanOrEqual(Math.floor(letters / 2) - 1);
    expect(play.mock.calls.length).toBeLessThanOrEqual(Math.ceil(text.length / 2));
    for (const [sound] of play.mock.calls) {
      expect(sound).toBe('typing');
    }
    // Stops when the line is out.
    const count = play.mock.calls.length;
    type(10);
    expect(play).toHaveBeenCalledTimes(count);
  });

  it('is silent on spaces and punctuation', () => {
    const { play } = render(<SpeechBubble text={'Hi    ....  !!ok'} />);
    type(20);
    // "Hi", then six pairs of only spaces, dots and marks, then "ok".
    expect(play.mock.calls.map(call => String.fromCharCode(call[1]))).toEqual([
      'H',
      'o',
    ]);
  });

  it('pitches each murmur by its letter, the same every time', () => {
    const first = render(<SpeechBubble text="Abc def" />);
    type(10);
    const second = render(<SpeechBubble text="Abc def" />);
    type(10);
    expect(first.play.mock.calls).toEqual(second.play.mock.calls);
    expect(first.play.mock.calls[0]).toEqual(['typing', 'A'.charCodeAt(0)]);
  });

  it('stops at once when the line is skipped', () => {
    const { renderer, play } = render(
      <SpeechBubble text="A long line that takes a good while to type out." />,
    );
    type(3);
    expect(play).toHaveBeenCalledTimes(3);
    const bubble = renderer.root.find(
      n => n.props.accessibilityHint === 'Shows the whole line',
    );
    act(() => bubble.props.onPress());
    type(30);
    expect(play).toHaveBeenCalledTimes(3);
  });

  it('starts again from the top for a new line, and stops on unmount', () => {
    const { renderer, play } = render(<SpeechBubble text="First line here." />);
    type(2);
    act(() => {
      renderer.update(
        <UiSoundContext.Provider value={play}>
          <SpeechBubble text="Zoo" />
        </UiSoundContext.Provider>,
      );
    });
    type(5);
    expect(play.mock.calls.map(call => String.fromCharCode(call[1]))).toEqual([
      'F',
      'r',
      'Z',
      'o',
    ]);
    act(() => renderer.unmount());
    type(5);
    expect(play).toHaveBeenCalledTimes(4);
  });
});
