/**
 * First-run onboarding: what the climber tells us about themselves, which
 * apps they agree to connect, and the optional home tests.
 *
 * Everything here is self-reported. The app does not measure or check it.
 * Test text is draft content for the prototype; a coach should review it
 * before release (see docs/climbing-app-design.md).
 */

export const ONBOARDING_VERSION = 1;

// About the climber

export const CLIMB_PLACES = ['bouldering-gym', 'rope-gym', 'outdoors'] as const;
export type ClimbPlace = (typeof CLIMB_PLACES)[number];

export const PLACE_LABEL: Readonly<Record<ClimbPlace, string>> = {
  'bouldering-gym': 'Bouldering gym',
  'rope-gym': 'Rope gym',
  outdoors: 'Outdoors',
};

export const EXPERIENCES = [
  'under-6-months',
  '6-to-24-months',
  '2-to-5-years',
  '5-plus-years',
] as const;
export type Experience = (typeof EXPERIENCES)[number];

export const EXPERIENCE_LABEL: Readonly<Record<Experience, string>> = {
  'under-6-months': 'Under 6 months',
  '6-to-24-months': '6 to 24 months',
  '2-to-5-years': '2 to 5 years',
  '5-plus-years': '5+ years',
};

/** Bouldering grades the climber usually sends, plus "not sure". */
export const USUAL_GRADES = [
  'V0',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'V7+',
  'not-sure',
] as const;
export type UsualGrade = (typeof USUAL_GRADES)[number];

export function gradeLabel(grade: UsualGrade): string {
  return grade === 'not-sure' ? 'Not sure' : grade;
}

export const GOALS = [
  'harder-grades',
  'more-styles',
  'injury-free',
  'finger-strength',
  'climb-more',
] as const;
export type ClimbingGoal = (typeof GOALS)[number];

export const GOAL_LABEL: Readonly<Record<ClimbingGoal, string>> = {
  'harder-grades': 'Climb harder grades',
  'more-styles': 'Try more styles',
  'injury-free': 'Stay injury free',
  'finger-strength': 'Get stronger fingers',
  'climb-more': 'Climb more often',
};

/** Height and arm span limits, in whole centimetres. */
export const BODY_CM = { min: 100, max: 250 } as const;

/** Describes reach. It is never scored as a strength or a weakness. */
export type Body = Readonly<{ heightCm: number; armSpanCm: number }>;

export type ClimberDetails = Readonly<{
  /** One or more. */
  places: readonly ClimbPlace[];
  experience: Experience;
  grade: UsualGrade;
  /** Shapes which quests the monkey offers. */
  goal: ClimbingGoal;
  /** Optional: both numbers or nothing. */
  body: Body | null;
}>;

// Other apps

export const CONNECTION_IDS = [
  'strava',
  'huawei-health',
  'apple-health',
  'health-connect',
  'garmin',
] as const;
export type ConnectionId = (typeof CONNECTION_IDS)[number];

export type ConnectionInfo = Readonly<{
  id: ConnectionId;
  name: string;
  /** What the app would ask to read. */
  reads: string;
  /** What it would never ask for. */
  neverReads: string;
}>;

/**
 * None of these integrations is built yet. Agreeing only records the choice
 * as a demo connection; no data is read.
 */
export const CONNECTIONS: Readonly<Record<ConnectionId, ConnectionInfo>> = {
  strava: {
    id: 'strava',
    name: 'Strava',
    reads: 'Your activities: type, date and duration.',
    neverReads: 'Your routes, location, photos or followers.',
  },
  'huawei-health': {
    id: 'huawei-health',
    name: 'Huawei Health',
    reads: 'Workouts, how long they took, and how long you slept.',
    neverReads: 'Heart rate, weight, location or medical data.',
  },
  'apple-health': {
    id: 'apple-health',
    name: 'Apple Health',
    reads: 'Workouts, how long they took, and how long you slept.',
    neverReads: 'Heart rate, weight, cycle tracking or medical records.',
  },
  'health-connect': {
    id: 'health-connect',
    name: 'Health Connect',
    reads: 'Workouts, how long they took, and how long you slept.',
    neverReads: 'Heart rate, weight, location or medical records.',
  },
  garmin: {
    id: 'garmin',
    name: 'Garmin',
    reads: 'Activities, how long they took, and sleep.',
    neverReads: 'Your routes, location or heart rate.',
  },
};

/**
 * Apps worth offering on a platform. The phone's own health store only
 * exists on its own platform; a browser could be either phone.
 */
export function connectionsFor(
  platform: 'harmony' | 'android' | 'ios' | 'web' | 'other',
): readonly ConnectionId[] {
  const store: ConnectionId[] =
    platform === 'ios'
      ? ['apple-health']
      : platform === 'android'
      ? ['health-connect']
      : platform === 'harmony'
      ? []
      : ['apple-health', 'health-connect'];
  return ['strava', 'huawei-health', ...store, 'garmin'];
}

/** "demo": they agreed, but this build only pretends. "declined": Not now. */
export type ConnectionChoice = 'demo' | 'declined';

export type AppConnection = Readonly<{
  id: ConnectionId;
  choice: ConnectionChoice;
}>;

// Home tests

export type BaselineTestId =
  | 'dead-hang'
  | 'pull-ups'
  | 'sit-and-reach'
  | 'plank'
  | 'one-leg-balance'
  | 'push-ups';

export type BaselineUnit = 'seconds' | 'reps' | 'cm';

/** Where a result belongs on the climbing profile. */
export type ProfileArea =
  | 'finger-endurance'
  | 'pulling-strength'
  | 'flexibility'
  | 'body-tension'
  | 'balance'
  | 'pushing-strength';

export const AREA_LABEL: Readonly<Record<ProfileArea, string>> = {
  'finger-endurance': 'Finger endurance',
  'pulling-strength': 'Pulling strength',
  flexibility: 'Flexibility',
  'body-tension': 'Body tension',
  balance: 'Balance',
  'pushing-strength': 'Pushing strength',
};

export type BaselineTest = Readonly<{
  id: BaselineTestId;
  name: string;
  area: ProfileArea;
  /** What it measures, in one plain sentence. */
  measures: string;
  unit: BaselineUnit;
  /** Timed with a stopwatch, or counted. */
  input: 'stopwatch' | 'counter';
  equipment: string;
  steps: readonly [string, string, string];
  /** One line. Not medical advice. */
  safety: string;
}>;

/** Accepted results per unit. Reach can be short of the toes (negative). */
export const BASELINE_LIMITS: Readonly<
  Record<BaselineUnit, Readonly<{ min: number; max: number }>>
> = {
  seconds: { min: 0, max: 600 },
  reps: { min: 0, max: 100 },
  cm: { min: -50, max: 60 },
};

/** Six tests most people can do at home in 5 to 10 minutes. */
export const BASELINE_TESTS: readonly BaselineTest[] = [
  {
    id: 'dead-hang',
    name: 'Dead hang',
    area: 'finger-endurance',
    measures: 'How long your fingers and shoulders can hold your weight.',
    unit: 'seconds',
    input: 'stopwatch',
    equipment: 'A pull-up bar you can hang from with straight arms.',
    steps: [
      'Grab the bar with both hands, palms facing away, about shoulder width apart.',
      'Start the timer, then lift your feet and hang with straight arms.',
      'Stop the timer when you let go.',
    ],
    safety: 'Warm up first. Stop if your fingers, elbows or shoulders hurt.',
  },
  {
    id: 'pull-ups',
    name: 'Pull-ups',
    area: 'pulling-strength',
    measures: 'How many times you can pull your own weight up to the bar.',
    unit: 'reps',
    input: 'counter',
    equipment: 'A pull-up bar.',
    steps: [
      'Hang from the bar with straight arms, palms facing away.',
      'Pull until your chin is over the bar, then lower all the way down.',
      'Count clean reps until you cannot do another. No kicking or swinging.',
    ],
    safety: 'Rest a few minutes after the hang. Stop if anything hurts.',
  },
  {
    id: 'sit-and-reach',
    name: 'Sit and reach',
    area: 'flexibility',
    measures:
      'How far you can fold forward, which needs loose hamstrings and lower back.',
    unit: 'cm',
    input: 'counter',
    equipment: 'Some floor and a ruler or tape measure. A friend helps.',
    steps: [
      'Sit on the floor with your legs straight and your toes pointing up.',
      'Breathe out and reach slowly along your legs. Hold it for 2 seconds.',
      'Measure from your fingertips to your toes. Short of your toes counts as minus.',
    ],
    safety: 'Ease in slowly, no bouncing. Stop if your back or legs hurt.',
  },
  {
    id: 'plank',
    name: 'Plank',
    area: 'body-tension',
    measures:
      'How long you can keep your body straight and stiff, like on a steep wall.',
    unit: 'seconds',
    input: 'stopwatch',
    equipment: 'Some floor. A mat if you have one.',
    steps: [
      'Rest on your forearms and toes, elbows under your shoulders.',
      'Start the timer and hold a straight line from head to heels.',
      'Stop the timer when your hips sag or lift.',
    ],
    safety: 'Skip this one if your back is injured. Stop if anything hurts.',
  },
  {
    id: 'one-leg-balance',
    name: 'One-leg balance',
    area: 'balance',
    measures: 'How long you stay steady on one foot with your eyes closed.',
    unit: 'seconds',
    input: 'stopwatch',
    equipment: 'A clear spot next to a wall or a chair.',
    steps: [
      'Stand on one leg with your hands on your hips.',
      'Start the timer and close your eyes.',
      'Stop when you open your eyes or your foot moves. Try both legs and keep your best.',
    ],
    safety: 'Stand close to a wall or chair so you can catch yourself.',
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    area: 'pushing-strength',
    measures:
      'How strong your pushing muscles are. Climbing mostly pulls, so these often lag behind.',
    unit: 'reps',
    input: 'counter',
    equipment: 'Some floor.',
    steps: [
      'Start in a high plank, hands a little wider than your shoulders.',
      'Lower until your chest is close to the floor, then push back up.',
      'Count clean reps until your form breaks. Knees down is fine.',
    ],
    safety: 'Stop if your wrists or shoulders hurt.',
  },
];

export function baselineTest(id: BaselineTestId): BaselineTest {
  const test = BASELINE_TESTS.find(t => t.id === id);
  if (!test) {
    throw new Error(`Unknown baseline test: ${id}`);
  }
  return test;
}

/** How the number got into the app. */
export type ResultMethod = 'stopwatch' | 'typed' | 'counter';

/** One home test result. Always self-reported. */
export type BaselineResult = Readonly<{
  testId: BaselineTestId;
  value: number;
  unit: BaselineUnit;
  method: ResultMethod;
  /** Local date, YYYY-MM-DD. */
  date: string;
}>;

// The whole result

export type OnboardingResult = Readonly<{
  version: typeof ONBOARDING_VERSION;
  /** Local date the flow was finished, YYYY-MM-DD. */
  date: string;
  details: ClimberDetails;
  /** Apps the climber answered, in a fixed order. Untouched apps are left out. */
  connections: readonly AppConnection[];
  /** Tests with a result, in test order. */
  baseline: readonly BaselineResult[];
  /** Tests without a result: skipped one by one or all at once. */
  skippedTests: readonly BaselineTestId[];
}>;

/** Answers while the flow is still open. */
export type OnboardingDraft = Readonly<{
  places: readonly ClimbPlace[];
  experience: Experience | null;
  grade: UsualGrade | null;
  goal: ClimbingGoal | null;
  body: Body | null;
  connections: Readonly<Partial<Record<ConnectionId, ConnectionChoice>>>;
  results: Readonly<
    Partial<
      Record<BaselineTestId, Readonly<{ value: number; method: ResultMethod }>>
    >
  >;
}>;

export const emptyOnboardingDraft: OnboardingDraft = {
  places: [],
  experience: null,
  grade: null,
  goal: null,
  body: null,
  connections: {},
  results: {},
};

// Checks

/** "12", " 7 ", "-3" -> numbers. Decimals, blanks and words -> null. */
export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Object.is(value, -0) ? 0 : value;
}

function rangeError(value: number, min: number, max: number): string | null {
  return Number.isInteger(value) && value >= min && value <= max
    ? null
    : `Use a whole number from ${min} to ${max}.`;
}

/** Error for a typed height or arm span, or null when it is fine. */
export function bodyCmError(text: string): string | null {
  if (text.trim() === '') {
    return 'Enter a number.';
  }
  const cm = parseWholeNumber(text);
  return cm === null
    ? `Use a whole number from ${BODY_CM.min} to ${BODY_CM.max}.`
    : rangeError(cm, BODY_CM.min, BODY_CM.max);
}

export function isValidBody(body: Body): boolean {
  return (
    rangeError(body.heightCm, BODY_CM.min, BODY_CM.max) === null &&
    rangeError(body.armSpanCm, BODY_CM.min, BODY_CM.max) === null
  );
}

/** Error for a test result, or null when it is fine. */
export function baselineError(
  test: BaselineTest,
  value: number,
): string | null {
  const { min, max } = BASELINE_LIMITS[test.unit];
  return rangeError(value, min, max);
}

/** The required answers, or the names of the ones still missing. */
export function missingDetails(draft: OnboardingDraft): string[] {
  return [
    draft.places.length === 0 && 'where you climb',
    draft.experience === null && 'how long you have climbed',
    draft.grade === null && 'your usual grade',
    draft.goal === null && 'your goal',
  ].filter((x): x is string => Boolean(x));
}

/**
 * The finished result, or null while a required answer is missing.
 * Invalid numbers are dropped rather than saved.
 */
export function buildOnboardingResult(
  draft: OnboardingDraft,
  date: string,
): OnboardingResult | null {
  const { experience, grade, goal } = draft;
  if (draft.places.length === 0 || !experience || !grade || !goal) {
    return null;
  }
  const baseline: BaselineResult[] = [];
  const skippedTests: BaselineTestId[] = [];
  BASELINE_TESTS.forEach(test => {
    const entry = draft.results[test.id];
    if (entry && baselineError(test, entry.value) === null) {
      baseline.push({
        testId: test.id,
        value: entry.value,
        unit: test.unit,
        method: entry.method,
        date,
      });
    } else {
      skippedTests.push(test.id);
    }
  });
  return {
    version: ONBOARDING_VERSION,
    date,
    details: {
      // Keep the listed order, whatever order they were tapped in.
      places: CLIMB_PLACES.filter(p => draft.places.includes(p)),
      experience,
      grade,
      goal,
      body: draft.body && isValidBody(draft.body) ? draft.body : null,
    },
    connections: CONNECTION_IDS.flatMap(id => {
      const choice = draft.connections[id];
      return choice ? [{ id, choice }] : [];
    }),
    baseline,
    skippedTests,
  };
}

/**
 * Accepts a saved result only if it has the shape buildOnboardingResult makes;
 * anything else reads as "setup not done" so the flow simply runs again.
 */
export function parseOnboardingResult(value: unknown): OnboardingResult | null {
  const v = value as Partial<OnboardingResult> | null | undefined;
  const details = v?.details as Partial<ClimberDetails> | undefined;
  const ok =
    v?.version === ONBOARDING_VERSION &&
    typeof v.date === 'string' &&
    Array.isArray(v.connections) &&
    Array.isArray(v.baseline) &&
    Array.isArray(v.skippedTests) &&
    Array.isArray(details?.places) &&
    typeof details?.experience === 'string' &&
    typeof details?.grade === 'string' &&
    typeof details?.goal === 'string';
  return ok ? (v as OnboardingResult) : null;
}

/** Keeps only well-formed results; a bad entry is dropped, not the lot. */
export function parseBaselineResults(value: unknown): BaselineResult[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (r): r is BaselineResult =>
      BASELINE_TESTS.some(t => t.id === r?.testId && t.unit === r?.unit) &&
      typeof r.value === 'number' &&
      Number.isFinite(r.value) &&
      typeof r.method === 'string' &&
      typeof r.date === 'string',
  );
}

/**
 * Newer results replace older ones for the same test. The list stays in
 * test order, so screens can show it as is.
 */
export function mergeBaseline(
  old: readonly BaselineResult[],
  incoming: readonly BaselineResult[],
): BaselineResult[] {
  return BASELINE_TESTS.flatMap(test => {
    const r =
      incoming.find(x => x.testId === test.id) ??
      old.find(x => x.testId === test.id);
    return r ? [r] : [];
  });
}

// Wording

/** 0 -> "0:00", 75 -> "1:15", 600 -> "10:00" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 4 -> "4 cm past your toes", -3 -> "3 cm short of your toes" */
export function describeReach(cm: number): string {
  if (cm === 0) {
    return 'Level with your toes';
  }
  return cm > 0 ? `${cm} cm past your toes` : `${-cm} cm short of your toes`;
}

/** "32 s", "1 min 15 s", "6 reps", "4 cm past your toes" */
export function formatResult(unit: BaselineUnit, value: number): string {
  switch (unit) {
    case 'seconds': {
      if (value < 60) {
        return `${value} s`;
      }
      const rest = value % 60;
      return `${Math.floor(value / 60)} min${rest ? ` ${rest} s` : ''}`;
    }
    case 'reps':
      return value === 1 ? '1 rep' : `${value} reps`;
    case 'cm':
      return describeReach(value);
  }
}
