import { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ResultMethod } from '@hackyeah/core';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { CapabilitiesContext } from '../../capabilities';
import { cleanNumber } from '../BoardInput';
import { RepCounter } from '../RepCounter';
import { Stopwatch } from '../Stopwatch';

type Renderer = ReactTestRenderer.ReactTestRenderer;
type Saved = { value: number | null; method: ResultMethod | undefined };

const capabilities: Capabilities = {
  platform: 'ios',
  platformLabel: 'Test OS',
  haptics: { isAvailable: true, tap: jest.fn() },
  storage: createMemoryStore(),
};

/** Holds the result like TestStep does, and logs every change. */
function Host({
  kind,
  min = 0,
  max = 100,
  start = null,
  log,
}: {
  kind: 'reps' | 'time';
  min?: number;
  max?: number;
  start?: Saved | null;
  log: Saved[];
}) {
  const [saved, setSaved] = useState<Saved>(
    start ?? { value: null, method: undefined },
  );
  const onChange = (value: number | null, method: ResultMethod) => {
    log.push({ value, method });
    setSaved({ value, method });
  };
  return kind === 'reps' ? (
    <RepCounter
      value={saved.value}
      method={saved.method}
      onChange={onChange}
      min={min}
      max={max}
      unit={min < 0 ? 'cm' : 'reps'}
      label="Pull-ups"
    />
  ) : (
    <Stopwatch
      value={saved.value}
      method={saved.method}
      onChange={onChange}
      max={max}
      label="Dead hang"
    />
  );
}

function render(props: Parameters<typeof Host>[0]) {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <CapabilitiesContext.Provider value={capabilities}>
        <Host {...props} />
      </CapabilitiesContext.Provider>,
    );
  });
  return renderer;
}

const REPS = 'Pull-ups, reps, tap to type';
const REACH = 'Pull-ups, cm, tap to type';
const TIME = 'Dead hang time, tap to type';

function boardInputs(renderer: Renderer, label: string) {
  return renderer.root.findAll(
    node =>
      typeof node.props.onFocus === 'function' &&
      node.props.accessibilityLabel === label,
  );
}

function board(renderer: Renderer, label: string) {
  const [input] = boardInputs(renderer, label);
  return {
    focus: () => act(() => boardInputs(renderer, label)[0].props.onFocus()),
    type: (text: string) =>
      act(() => boardInputs(renderer, label)[0].props.onChangeText(text)),
    enter: () =>
      act(() => boardInputs(renderer, label)[0].props.onSubmitEditing()),
    blur: () => act(() => boardInputs(renderer, label)[0].props.onBlur()),
    escape: () =>
      act(() =>
        boardInputs(renderer, label)[0].props.onKeyPress({
          nativeEvent: { key: 'Escape' },
        }),
      ),
    input,
  };
}

function press(renderer: Renderer, label: string) {
  const node = renderer.root.find(
    n =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityLabel === label,
  );
  act(() => node.props.onPress());
}

function screenText(renderer: Renderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(child => typeof child === 'string' || typeof child === 'number')
    .join('');
}

function hasCaret(renderer: Renderer) {
  return renderer.root.findAll(n => n.props.testID === 'scoreboard-caret')
    .length > 0;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('typing onto the rep counter', () => {
  it('saves a typed count, with a caret and hint while editing', () => {
    const log: Saved[] = [];
    const renderer = render({ kind: 'reps', log });
    expect(screenText(renderer)).toContain('Tap the number to type it');
    expect(screenText(renderer)).not.toContain('Type it in');
    const b = board(renderer, REPS);
    expect(b.input.props.accessibilityHint).toBe(
      'Type a whole number from 0 to 100',
    );
    b.focus();
    expect(hasCaret(renderer)).toBe(true);
    b.type('1');
    b.type('12');
    b.enter();
    b.blur(); // Enter also blurs; it must not end twice
    expect(hasCaret(renderer)).toBe(false);
    expect(log[log.length - 1]).toEqual({ value: 12, method: 'typed' });
    expect(log.filter(s => s.value === null)).toEqual([]);
    act(() => renderer.unmount());
  });

  it('keeps the counter keys working, reported as counted', () => {
    const log: Saved[] = [];
    const renderer = render({ kind: 'reps', log });
    const b = board(renderer, REPS);
    b.focus();
    b.type('7');
    b.blur();
    press(renderer, 'One more, Pull-ups');
    expect(log).toEqual([
      { value: 7, method: 'typed' },
      { value: 8, method: 'counter' },
    ]);
    act(() => renderer.unmount());
  });

  it('does not save a number out of range, and says why', () => {
    const log: Saved[] = [];
    const renderer = render({
      kind: 'reps',
      log,
      max: 30,
      start: { value: 5, method: 'counter' },
    });
    const b = board(renderer, REPS);
    b.focus();
    b.type('45');
    expect(screenText(renderer)).toContain('Use a whole number from 0 to 30.');
    b.enter();
    expect(log).toEqual([]); // 5 by the counter stays
    expect(screenText(renderer)).toContain('Use a whole number from 0 to 30.');
    press(renderer, 'One more, Pull-ups');
    expect(screenText(renderer)).not.toContain('Use a whole number');
    expect(log).toEqual([{ value: 6, method: 'counter' }]);
    act(() => renderer.unmount());
  });

  it('puts back a good number typed on the way to a bad one', () => {
    const log: Saved[] = [];
    const renderer = render({
      kind: 'reps',
      log,
      start: { value: 5, method: 'counter' },
    });
    const b = board(renderer, REPS);
    b.focus();
    b.type('1'); // saved as typed on the way
    b.type('150');
    b.blur();
    expect(log).toEqual([
      { value: 1, method: 'typed' },
      { value: 5, method: 'counter' },
    ]);
    act(() => renderer.unmount());
  });

  it('cancels on Escape and puts the old value back', () => {
    const log: Saved[] = [];
    const renderer = render({
      kind: 'reps',
      log,
      start: { value: 3, method: 'counter' },
    });
    const b = board(renderer, REPS);
    b.focus();
    b.type('9');
    b.escape();
    b.blur(); // Escape blurs too; that must not save
    expect(log).toEqual([
      { value: 9, method: 'typed' },
      { value: 3, method: 'counter' },
    ]);
    expect(hasCaret(renderer)).toBe(false);
    act(() => renderer.unmount());
  });

  it('cancels back to not counted yet', () => {
    const log: Saved[] = [];
    const renderer = render({ kind: 'reps', log });
    const b = board(renderer, REPS);
    b.focus();
    b.type('4');
    b.escape();
    expect(log[log.length - 1]).toEqual({ value: null, method: 'typed' });
    act(() => renderer.unmount());
  });

  it('takes a negative number when the range goes below zero', () => {
    const log: Saved[] = [];
    const renderer = render({ kind: 'reps', log, min: -50, max: 60 });
    const b = board(renderer, REACH);
    b.focus();
    b.type('-');
    expect(screenText(renderer)).not.toContain('Use a whole number');
    b.type('-12');
    b.enter();
    expect(log).toEqual([{ value: -12, method: 'typed' }]);
    b.focus();
    b.type('-51');
    expect(screenText(renderer)).toContain(
      'Use a whole number from -50 to 60.',
    );
    act(() => renderer.unmount());
  });

  it('only lets digits and one leading minus in', () => {
    expect(cleanNumber('-1-2a', true)).toBe('-12');
    expect(cleanNumber('-12', false)).toBe('12');
    expect(cleanNumber('4.5', false)).toBe('45');
  });
});

describe('typing onto the stopwatch', () => {
  it('fills the clock in from the right, like a microwave', () => {
    const log: Saved[] = [];
    const renderer = render({ kind: 'time', log, max: 600 });
    expect(screenText(renderer)).toContain('Tap the time to type it');
    const b = board(renderer, TIME);
    b.focus();
    b.type('1');
    b.type('12');
    b.type('125');
    b.enter();
    expect(log[log.length - 1]).toEqual({ value: 85, method: 'typed' });
    expect(screenText(renderer)).toContain('Your time: 1 min 25 s.');
    b.focus();
    b.type('9');
    b.type('90');
    b.enter();
    expect(log[log.length - 1]).toEqual({ value: 90, method: 'typed' });
    expect(screenText(renderer)).toContain('Your time: 1 min 30 s.');
    act(() => renderer.unmount());
  });

  it('does not save a time over the limit', () => {
    const log: Saved[] = [];
    const renderer = render({
      kind: 'time',
      log,
      max: 600,
      start: { value: 30, method: 'stopwatch' },
    });
    const b = board(renderer, TIME);
    b.focus();
    b.type('1001');
    expect(screenText(renderer)).toContain('Use a time up to 10:00.');
    b.enter();
    expect(log).toEqual([]);
    act(() => renderer.unmount());
  });

  it('cancels on Escape', () => {
    const log: Saved[] = [];
    const renderer = render({
      kind: 'time',
      log,
      start: { value: 30, method: 'stopwatch' },
    });
    const b = board(renderer, TIME);
    b.focus();
    b.type('45');
    b.escape();
    expect(log).toEqual([
      { value: 45, method: 'typed' },
      { value: 30, method: 'stopwatch' },
    ]);
    act(() => renderer.unmount());
  });

  it('cannot be typed into while it runs', () => {
    const log: Saved[] = [];
    const renderer = render({ kind: 'time', log });
    press(renderer, 'Start');
    act(() => jest.advanceTimersByTime(3_200));
    expect(boardInputs(renderer, TIME)).toEqual([]);
    expect(screenText(renderer)).not.toContain('Tap the time to type it');
    press(renderer, 'Stop');
    expect(boardInputs(renderer, TIME).length).toBeGreaterThan(0);
    expect(log[log.length - 1]).toEqual({ value: 3, method: 'stopwatch' });
    act(() => renderer.unmount());
  });
});
