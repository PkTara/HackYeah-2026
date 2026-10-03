/**
 * The onboarding steps, their order and what the monkey says on each.
 * Pure data and functions, so the order is easy to read and to test.
 */
import {
  BASELINE_TESTS,
  CONNECTIONS,
  type BaselineTestId,
  type ConnectionId,
} from '@hackyeah/core';

/** One app's permission screen, opened from the apps step. */
export type ConsentStepId = `consent:${ConnectionId}`;

export type StepId =
  | 'welcome'
  | 'places'
  | 'experience'
  | 'grade'
  | 'goal'
  | 'body'
  | 'apps'
  | ConsentStepId
  | 'tests'
  | BaselineTestId
  | 'done';

/** The main path, one question or one test per step. */
export const STEP_ORDER: readonly StepId[] = [
  'welcome',
  'places',
  'experience',
  'grade',
  'goal',
  'body',
  'apps',
  'tests',
  ...BASELINE_TESTS.map(test => test.id),
  'done',
];

export function isTestStep(step: StepId): step is BaselineTestId {
  return BASELINE_TESTS.some(test => test.id === step);
}

export function consentStep(id: ConnectionId): ConsentStepId {
  return `consent:${id}`;
}

/** The app a consent step asks about, or null for other steps. */
export function consentApp(step: StepId): ConnectionId | null {
  return step.startsWith('consent:')
    ? (step.slice('consent:'.length) as ConnectionId)
    : null;
}

/** The step after this one. The last test leads to done. */
export function nextStep(step: StepId): StepId {
  if (consentApp(step)) {
    return 'apps';
  }
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)];
}

/**
 * Progress bar segments. The six home tests share the last segment, so the
 * bar reads "Step 7 of 7" while they run.
 */
export const CHAPTERS = 7;

/** 0 on the welcome screen, then 1 to CHAPTERS. Done fills the bar. */
export function chapterOf(step: StepId): number {
  if (step === 'welcome') {
    return 0;
  }
  if (consentApp(step)) {
    return chapterOf('apps');
  }
  if (step === 'done' || step === 'tests' || isTestStep(step)) {
    return CHAPTERS;
  }
  return STEP_ORDER.indexOf(step);
}

/** Perches in the jungle strip at the top. */
export const PERCHES = 7;

/**
 * Where the monkey hangs on each step. It zig-zags across the strip, so
 * every step change is a real hop.
 */
const PERCH: Readonly<Record<Exclude<StepId, ConsentStepId>, number>> = {
  welcome: 3,
  places: 0,
  experience: 4,
  grade: 1,
  goal: 5,
  body: 2,
  apps: 6,
  tests: 3,
  'dead-hang': 0,
  'pull-ups': 4,
  'sit-and-reach': 1,
  plank: 5,
  'one-leg-balance': 2,
  'push-ups': 6,
  done: 3,
};
/** Consent screens: a short hop away from the apps list and back. */
const CONSENT_PERCH = 4;

export function perchOf(step: StepId): number {
  return consentApp(step) ? CONSENT_PERCH : PERCH[step as keyof typeof PERCH];
}

/** Where you are and where you came from (for the monkey's hop). */
export type Nav = Readonly<{
  history: readonly StepId[];
  from: StepId | null;
}>;

export const startNav: Nav = { history: ['welcome'], from: null };

export function currentStep(nav: Nav): StepId {
  return nav.history[nav.history.length - 1];
}

export function goTo(nav: Nav, step: StepId): Nav {
  return { history: [...nav.history, step], from: currentStep(nav) };
}

/** Back to the step you came from, which may not be the previous in order. */
export function goBack(nav: Nav): Nav {
  if (nav.history.length < 2) {
    return nav;
  }
  return { history: nav.history.slice(0, -1), from: currentStep(nav) };
}

const LINES: Readonly<Record<Exclude<StepId, ConsentStepId>, string>> = {
  welcome:
    "Hi, I'm your climbing monkey. I help you see how you climb and pick one thing to work on next.",
  places: 'First up: where do you climb? Pick all that fit.',
  experience: 'And how long have you been climbing?',
  grade: 'What grade do you usually send? A rough guess is fine.',
  goal: 'What do you want most from climbing right now? Your goal shapes the quests I give you.',
  body: 'Want to add your height and arm span? It tells me about your reach. Skip it if you like.',
  apps: 'Use other apps for training? You decide for each one. In this build it is only a demo, so nothing is read.',
  tests: 'Want a baseline? 6 quick tests at home, about 5 to 10 minutes. All optional.',
  'dead-hang': 'First, a dead hang. Straight arms, and keep breathing.',
  'pull-ups': 'Pull-ups next. Clean reps only, no kicking.',
  'sit-and-reach': 'Time to stretch. Reach slowly and do not bounce.',
  plank: 'Plank time. Keep your hips in line with your shoulders.',
  'one-leg-balance': 'Eyes closed, one leg. Wobbling is part of it.',
  'push-ups': 'Last one: push-ups. They train the muscles climbing tends to skip.',
  done: 'All set. I saved your answers and your profile is ready!',
};

/** What the monkey says on a step. */
export function lineFor(step: StepId): string {
  const app = consentApp(step);
  return app
    ? `Here is what ${CONNECTIONS[app].name} would read. Your call.`
    : LINES[step as keyof typeof LINES];
}
