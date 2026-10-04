import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { OnboardingResult } from '@hackyeah/core';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { CapabilitiesContext } from '../../capabilities';
import { OnboardingFlow } from '../OnboardingFlow';
import {
  STEP_ORDER,
  chapterOf,
  goBack,
  goTo,
  lineFor,
  nextStep,
  propFor,
  startNav,
  type StepId,
} from '../flow';
import { MONKEY_PROPS } from '@hackyeah/ui';

type Renderer = ReactTestRenderer.ReactTestRenderer;

const capabilities: Capabilities = {
  platform: 'ios',
  platformLabel: 'Test OS',
  haptics: { isAvailable: true, tap: jest.fn() },
  storage: createMemoryStore(),
};

function render(onFinish = jest.fn(), onSkip = jest.fn()) {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <CapabilitiesContext.Provider value={capabilities}>
        <OnboardingFlow
          onFinish={onFinish}
          onSkip={onSkip}
          today="2026-10-03"
        />
      </CapabilitiesContext.Provider>,
    );
  });
  return renderer;
}

/** The pressable with this accessibility label. */
function find(renderer: Renderer, label: string) {
  return renderer.root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  );
}

function isDisabled(renderer: Renderer, label: string): boolean {
  return Boolean(find(renderer, label).props.accessibilityState?.disabled);
}

function press(renderer: Renderer, ...labels: string[]) {
  labels.forEach(label => {
    expect({ label, disabled: isDisabled(renderer, label) }).toEqual({
      label,
      disabled: false,
    });
    act(() => find(renderer, label).props.onPress());
  });
}

function type(renderer: Renderer, label: string, text: string) {
  const input = renderer.root.find(
    node =>
      typeof node.props.onChangeText === 'function' &&
      node.props.accessibilityLabel === label,
  );
  act(() => input.props.onChangeText(text));
}

/** All system-font text on screen. Pixel text is drawn, not written. */
function screenText(renderer: Renderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(child => typeof child === 'string' || typeof child === 'number')
    .join('');
}

function has(renderer: Renderer, label: string): boolean {
  return (
    renderer.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel === label,
    ).length > 0
  );
}

/** What the guide monkey holds or wears right now, from its testID. */
function monkeyProp(renderer: Renderer): string {
  const ids = renderer.root
    .findAll(
      node =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('monkey-prop-'),
    )
    .map(node => node.props.testID.slice('monkey-prop-'.length));
  expect(ids).toHaveLength(1);
  return ids[0];
}

/** Welcome to the body step, answering the four required questions. */
function answerRequired(renderer: Renderer) {
  press(renderer, 'Start');
  expect(isDisabled(renderer, 'Next')).toBe(true);
  press(renderer, 'Outdoors', 'Bouldering gym', 'Next');
  press(renderer, '2 to 5 years', 'Next');
  press(renderer, 'V7+', 'Next');
  press(renderer, 'Get stronger fingers', 'Next');
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('OnboardingFlow', () => {
  it('skips straight to the app from the first screen', () => {
    const onSkip = jest.fn();
    const renderer = render(jest.fn(), onSkip);
    press(renderer, 'Skip setup');
    expect(onSkip).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('waits for an answer before each required question moves on', () => {
    const renderer = render();
    press(renderer, 'Start');
    expect(isDisabled(renderer, 'Next')).toBe(true);
    press(renderer, 'Rope gym');
    expect(isDisabled(renderer, 'Next')).toBe(false);
    press(renderer, 'Rope gym'); // tapped again: unpicked
    expect(isDisabled(renderer, 'Next')).toBe(true);
    act(() => renderer.unmount());
  });

  it('hands over the answers when everything optional is skipped', () => {
    const onFinish = jest.fn();
    const renderer = render(onFinish);
    answerRequired(renderer);
    press(renderer, 'Skip reach', 'Skip apps', 'Skip for now');
    expect(screenText(renderer)).toContain('Skipped for now');
    press(renderer, 'Go to my profile');

    const result: OnboardingResult = onFinish.mock.calls[0][0];
    expect(result).toEqual({
      version: 1,
      date: '2026-10-03',
      details: {
        places: ['bouldering-gym', 'outdoors'],
        experience: '2-to-5-years',
        grade: 'V7+',
        goal: 'finger-strength',
        body: null,
      },
      connections: [],
      baseline: [],
      skippedTests: [
        'dead-hang',
        'pull-ups',
        'sit-and-reach',
        'plank',
        'one-leg-balance',
        'push-ups',
      ],
    });
    act(() => renderer.unmount());
  });

  it('saves reach, a demo connection and home test results', () => {
    const onFinish = jest.fn();
    const renderer = render(onFinish);
    answerRequired(renderer);

    // Reach: a typo is caught before moving on.
    type(renderer, 'Height in cm', '178');
    type(renderer, 'Arm span in cm', '18');
    press(renderer, 'Next');
    expect(screenText(renderer)).toContain(
      'Use a whole number from 100 to 250.',
    );
    type(renderer, 'Arm span in cm', '183');
    press(renderer, 'Next');

    // Apps: each asks on its own, and its consent screen says what it reads.
    expect(has(renderer, 'Connect Apple Health')).toBe(true);
    expect(has(renderer, 'Connect Health Connect')).toBe(false);
    press(renderer, 'Connect Strava');
    expect(screenText(renderer)).toContain(
      'Your routes, location, photos or followers.',
    );
    press(renderer, 'Allow Strava (demo)');
    expect(screenText(renderer)).toContain('Connected (demo)');
    press(renderer, 'Not now for Garmin', 'Next');

    // Tests: a timed one typed in, a counted one, the rest skipped.
    press(renderer, 'Start tests');
    expect(isDisabled(renderer, 'Next')).toBe(true);
    press(renderer, 'Type it in');
    type(renderer, 'Dead hang time in seconds', '34');
    press(renderer, 'Next');
    expect(isDisabled(renderer, 'Next')).toBe(true); // not counted yet
    press(
      renderer,
      'One more, Pull-ups',
      'One more, Pull-ups',
      'One less, Pull-ups',
    );
    press(renderer, 'Next');
    press(renderer, 'One less, Sit and reach', 'Next'); // short of the toes
    press(renderer, 'Skip this one', 'Skip this one');
    press(renderer, 'One less, Push-ups', 'Next'); // a real zero
    expect(screenText(renderer)).toContain('4 of 6 done');
    press(renderer, 'Go to my profile');

    const result: OnboardingResult = onFinish.mock.calls[0][0];
    expect(result.details.body).toEqual({ heightCm: 178, armSpanCm: 183 });
    expect(result.connections).toEqual([
      { id: 'strava', choice: 'demo' },
      { id: 'garmin', choice: 'declined' },
    ]);
    expect(
      result.baseline.map(r => [r.testId, r.value, r.unit, r.method]),
    ).toEqual([
      ['dead-hang', 34, 'seconds', 'typed'],
      ['pull-ups', 1, 'reps', 'counter'],
      ['sit-and-reach', -1, 'cm', 'counter'],
      ['push-ups', 0, 'reps', 'counter'],
    ]);
    expect(result.skippedTests).toEqual(['plank', 'one-leg-balance']);
    act(() => renderer.unmount());
  });

  it('times a test with the stopwatch', () => {
    const onFinish = jest.fn();
    const renderer = render(onFinish);
    answerRequired(renderer);
    press(renderer, 'Skip reach', 'Skip apps', 'Start tests', 'Start');
    act(() => jest.advanceTimersByTime(12_400));
    expect(isDisabled(renderer, 'Next')).toBe(true); // still running
    press(renderer, 'Stop');
    expect(screenText(renderer)).toContain('Your time: ');
    press(renderer, 'Next');
    [
      'Skip this one',
      'Skip this one',
      'Skip this one',
      'Skip this one',
      'Skip this one',
    ].forEach(label => press(renderer, label));
    press(renderer, 'Go to my profile');
    const result: OnboardingResult = onFinish.mock.calls[0][0];
    expect(result.baseline).toEqual([
      {
        testId: 'dead-hang',
        value: 12,
        unit: 'seconds',
        method: 'stopwatch',
        date: '2026-10-03',
      },
    ]);
    act(() => renderer.unmount());
  });

  it('gives the monkey a prop for each step as you go', () => {
    const renderer = render();
    const seen = [monkeyProp(renderer)];
    press(renderer, 'Start');
    seen.push(monkeyProp(renderer));
    press(renderer, 'Outdoors', 'Next');
    seen.push(monkeyProp(renderer));
    press(renderer, '2 to 5 years', 'Next');
    seen.push(monkeyProp(renderer));
    press(renderer, 'V7+', 'Next');
    seen.push(monkeyProp(renderer));
    press(renderer, 'Get stronger fingers', 'Next');
    seen.push(monkeyProp(renderer));
    press(renderer, 'Skip reach');
    seen.push(monkeyProp(renderer));
    press(renderer, 'Connect Strava');
    seen.push(monkeyProp(renderer));
    press(renderer, 'Back', 'Skip apps');
    seen.push(monkeyProp(renderer));
    press(renderer, 'Start tests');
    for (let i = 0; i < 6; i++) {
      seen.push(monkeyProp(renderer));
      press(renderer, 'Skip this one');
    }
    seen.push(monkeyProp(renderer));
    expect(seen).toEqual([
      'wave',
      'map',
      'alarm-clock',
      'grade-sign',
      'trophy',
      'tape-measure',
      'phone',
      'phone',
      'clipboard',
      'stopwatch',
      'tally-counter',
      'ruler',
      'hourglass',
      'one-foot-up',
      'sweatband',
      'party-hat',
    ]);
    act(() => renderer.unmount());
  });

  it('goes back to where you came from', () => {
    const renderer = render();
    answerRequired(renderer);
    press(renderer, 'Skip reach', 'Connect Strava', 'Back');
    expect(screenText(renderer)).toContain('Would read:');
    press(renderer, 'Back', 'Back');
    expect(has(renderer, 'Climb harder grades')).toBe(true);
    act(() => renderer.unmount());
  });
});

describe('the step order', () => {
  it('asks one thing per step and ends on done', () => {
    expect(STEP_ORDER[0]).toBe('welcome');
    expect(STEP_ORDER[STEP_ORDER.length - 1]).toBe('done');
    expect(nextStep('push-ups')).toBe('done');
    expect(nextStep('consent:strava')).toBe('apps');
  });

  it('fills the progress bar step by step', () => {
    const chapters = STEP_ORDER.map(chapterOf);
    expect(chapters[0]).toBe(0);
    chapters
      .slice(1)
      .forEach((c, i) => expect(c).toBeGreaterThanOrEqual(chapters[i]));
    expect(chapterOf('done')).toBe(7);
  });

  it('keeps the monkey plain-spoken, with one exclamation at the very end', () => {
    const lines = [...STEP_ORDER.map(lineFor), lineFor('consent:garmin')];
    lines.forEach(line =>
      expect(line).not.toMatch(/[–—]|let's|journey|unlock|empower|seamless/i),
    );
    expect(lines.filter(line => line.includes('!'))).toEqual([lineFor('done')]);
  });

  it('gives every step its own monkey prop', () => {
    const steps: StepId[] = [...STEP_ORDER, 'consent:strava', 'consent:garmin'];
    steps.forEach(step => expect(MONKEY_PROPS).toHaveProperty([propFor(step)]));
    // Consent screens keep the phone from the apps step.
    expect(propFor('consent:strava')).toBe(propFor('apps'));
    // Along the main path no two steps look the same.
    const props = STEP_ORDER.map(propFor);
    expect(new Set(props).size).toBe(props.length);
  });

  it('remembers where you came from, for the hop', () => {
    const nav = goTo(goTo(startNav, 'places'), 'experience');
    expect(nav.from).toBe('places');
    expect(goBack(nav)).toEqual({
      history: ['welcome', 'places'],
      from: 'experience',
    });
    expect(goBack(startNav)).toBe(startNav);
  });
});
