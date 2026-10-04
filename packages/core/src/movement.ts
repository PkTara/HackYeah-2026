/**
 * The movement radar: five axes, each a summary of the climber's own logs
 * and home tests. Not a skill test and not a grade prediction.
 *
 * Every axis follows the same rule, written so it fits on one line:
 *
 *   matching climbs you sent (1 point each) + its home test (0 to 3 points)
 *
 * An axis is only scored once there is enough evidence: RADAR_MIN_CLIMBS
 * matching climbs logged, or a result for its home test. Below that it is
 * "Not enough data" and has no value, so the chart never draws it as zero.
 * The level then comes from the points: Started, Building, Established.
 *
 * Which climbs and tests count for which axis, the gate, the test marks and
 * the level boundaries are team rules. Research only backs why a signal is
 * worth looking at for an axis (see AXIS_RULES[...].sourceIds); none of it
 * validates this radar. The same rule lives in the server's profile
 * (backend/src/climbing_monkey/profile.py); see docs/decision-evidence.md.
 */
import type { AssessmentRecord } from './assessments';
import { MIN_LOGS, type ClimbLog, type Movement, type Terrain } from './climbing';
import type { BaselineResult, BaselineTestId } from './onboarding';

export type MovementAxisId =
  | 'footwork'
  | 'balance'
  | 'tension'
  | 'stamina'
  | 'dynos';

/** Clockwise from the top, so shapes compare across sessions. */
export const MOVEMENT_AXES: readonly MovementAxisId[] = [
  'footwork',
  'balance',
  'tension',
  'stamina',
  'dynos',
];

/** Matching climbs needed before an axis is scored without a home test. */
export const RADAR_MIN_CLIMBS = MIN_LOGS;
/** Points where an axis reaches Building and Established. */
export const RADAR_LEVEL_POINTS = { building: 4, established: 8 } as const;
/** Climbs logged on one day that make it a long session (Stamina). */
export const LONG_SESSION_CLIMBS = 5;

/** 0 is "not enough data", never a low score. */
export type RadarLevel = 0 | 1 | 2 | 3;
export const RADAR_LEVEL_NAME: Readonly<Record<RadarLevel, string>> = {
  0: 'Not enough data',
  1: 'Started',
  2: 'Building',
  3: 'Established',
};

/**
 * A climb matches when any clause matches. A clause needs the wall (when it
 * lists walls) and at least one of the styles (when it lists styles).
 */
export type AxisClause = Readonly<{
  walls?: readonly Terrain[];
  styles?: readonly Movement[];
}>;

export type AxisRule = Readonly<{
  id: MovementAxisId;
  name: string;
  /** The climbs that count: "slab climbs and climbs marked balance". */
  climbsText: string;
  /** Everything that counts, climbs and test, for one line of copy. */
  counts: string;
  /** A picture hint for the app (see FlowIcon in flow.ts). */
  icon: string;
  /** What to log more of, singular: "slab climb". */
  logOne: string;
  /** Plural of logOne: "slab climbs". */
  logMany: string;
  match: readonly AxisClause[];
  /** The home test that also counts, with its marks for 1, 2 and 3 points. */
  test?: Readonly<{
    id: BaselineTestId;
    name: string;
    marks: readonly [number, number, number];
  }>;
  /** Stamina also counts days with LONG_SESSION_CLIMBS or more climbs. */
  longSessions?: boolean;
  /** The team's reason for these signals, in one plain line. */
  why: string;
  /** Studies that back looking at these signals. Never the radar itself. */
  sourceIds: readonly string[];
}>;

/**
 * Why each axis counts what it counts:
 * - Footwork: slab and vertical walls put more of the weight on the feet
 *   than steep ones, where the arms take over (noe2001). Overhangs belong to
 *   Tension. On vertical walls only climbs you marked technical or
 *   controlled count, since a dynamic vertical climb says more about Dynos.
 * - Balance: slab climbing is mostly about staying over your feet, and the
 *   balance style is your own tag for it. The one-leg stance is a repeatable
 *   floor test (springer2007); postural stability shows up in reviews of
 *   what successful climbers have in common (saul2019).
 * - Tension: overhangs need the arms and body to keep you on (noe2001), and
 *   compression and powerful are the styles that load the trunk most. The
 *   plank is a repeatable trunk test (tong2014) and climbing itself trains
 *   trunk strength (muehlbauer2012).
 * - Stamina: the endurance style, long days on the wall, and the dead hang.
 *   Hang tests were part of a strength and endurance factor linked with
 *   climbing level (balas2012); long hang times show up in reviews of
 *   successful climbers (saul2019).
 * - Dynos: dynamic and coordination styles. In World Cup finals more than
 *   half of the boulder sections had a dynamic crux (augste2021). There is
 *   no home test for it, so only climbs count.
 * Camera leg spread, shoulder reach, ape index, finger strength, pull-ups,
 * push-ups and sit and reach are left out on purpose: flexibility and body
 * size are not technique, and pulling and finger strength have their own
 * records.
 */
export const AXIS_RULES: Readonly<Record<MovementAxisId, AxisRule>> = {
  footwork: {
    id: 'footwork',
    name: 'Footwork',
    climbsText: 'slab climbs and vertical climbs marked technical or controlled',
    counts: 'slab climbs and vertical climbs marked technical or controlled',
    icon: 'shoe',
    logOne: 'slab climb',
    logMany: 'slab climbs',
    match: [
      { walls: ['slab'] },
      { walls: ['vertical'], styles: ['technical', 'controlled'] },
    ],
    why: 'On slab and vertical walls your feet carry more of your weight than on steep ones.',
    sourceIds: ['noe2001'],
  },
  balance: {
    id: 'balance',
    name: 'Balance',
    climbsText: 'slab climbs and climbs marked balance',
    counts: 'slab climbs and climbs marked balance, plus the one-leg balance test',
    icon: 'slab',
    logOne: 'slab or balance climb',
    logMany: 'slab or balance climbs',
    match: [{ walls: ['slab'] }, { styles: ['balance'] }],
    test: { id: 'one-leg-balance', name: 'one-leg balance', marks: [10, 20, 30] },
    why: 'Slabs are mostly about staying balanced over your feet. The one-leg test checks balance on the floor.',
    sourceIds: ['springer2007', 'saul2019'],
  },
  tension: {
    id: 'tension',
    name: 'Tension',
    climbsText: 'overhang climbs and climbs marked compression or powerful',
    counts:
      'overhang climbs and climbs marked compression or powerful, plus the plank test',
    icon: 'overhang',
    logOne: 'overhang climb',
    logMany: 'overhang climbs',
    match: [{ walls: ['overhang'] }, { styles: ['compression', 'powerful'] }],
    test: { id: 'plank', name: 'plank', marks: [30, 60, 90] },
    why: 'Steep walls and squeezing moves need a stiff body to keep your feet on. The plank checks how long you hold it on the floor.',
    sourceIds: ['noe2001', 'tong2014', 'muehlbauer2012'],
  },
  stamina: {
    id: 'stamina',
    name: 'Stamina',
    climbsText: 'climbs marked endurance',
    counts:
      'climbs marked endurance and long sessions, plus the dead hang test',
    icon: 'clock',
    logOne: 'endurance climb',
    logMany: 'endurance climbs',
    match: [{ styles: ['endurance'] }],
    test: { id: 'dead-hang', name: 'dead hang', marks: [20, 40, 60] },
    longSessions: true,
    why: 'Long climbs, long days and long hangs all ask you to keep going.',
    sourceIds: ['balas2012', 'saul2019'],
  },
  dynos: {
    id: 'dynos',
    name: 'Dynos',
    climbsText: 'climbs marked dynamic or coordination',
    counts: 'climbs marked dynamic or coordination',
    icon: 'banana',
    logOne: 'dynamic or coordination climb',
    logMany: 'dynamic or coordination climbs',
    match: [{ styles: ['dynamic', 'coordination'] }],
    why: 'Jumps and swings are their own kind of move, so they get their own axis. No home test covers them.',
    sourceIds: ['augste2021'],
  },
};

export function matchesAxis(rule: AxisRule, log: ClimbLog): boolean {
  return rule.match.some(
    clause =>
      (!clause.walls || clause.walls.includes(log.terrain)) &&
      (!clause.styles || clause.styles.some(s => log.movements.includes(s))),
  );
}

/** 0 to 3 points: one for each mark the result reaches. */
export function testPoints(
  marks: readonly [number, number, number],
  value: number,
): number {
  return marks.filter(mark => value >= mark).length;
}

/** What the radar reads: the same state the profile already has. */
export type MovementInputs = Readonly<{
  logs: readonly ClimbLog[];
  baseline: readonly BaselineResult[];
  assessments?: readonly AssessmentRecord[];
}>;

/**
 * How a value got into the app. Climbs are always entered by the climber.
 * A home test timed or counted with the app is "measured"; a typed one is
 * "entered". No axis uses camera estimates.
 */
export type InputSource = 'entered' | 'measured';

export type AxisTest = Readonly<{
  id: BaselineTestId;
  name: string;
  value: number;
  /** YYYY-MM-DD. */
  date: string;
  source: InputSource;
  /** Where it was found: a home test on this device or a saved assessment. */
  from: 'home test' | 'assessment';
  /** Demo data: a sample home test or a simulated record, not the climber's own. */
  simulated: boolean;
  points: number;
  marks: readonly [number, number, number];
}>;

export type AxisScore = Readonly<{
  axis: MovementAxisId;
  name: string;
  scored: boolean;
  level: RadarLevel;
  /** level / 3 for the chart, or null below the gate. */
  value: number | null;
  points: number;
  /** Matching climbs, in log order. */
  climbs: readonly ClimbLog[];
  sent: number;
  /** The axis's home test result, null when it has a test but no result. */
  test: AxisTest | null;
  /** Stamina only: dates with LONG_SESSION_CLIMBS or more climbs. */
  longSessions: readonly string[];
  /** Any record behind it is sample or simulated data. */
  sample: boolean;
  /** One plain next step. */
  next: string;
}>;

const SOURCE: Readonly<Record<BaselineResult['method'], InputSource>> = {
  stopwatch: 'measured',
  counter: 'measured',
  typed: 'entered',
};

/** Only dead hang has a server metric; the others stay on the device. */
const TEST_METRIC: Partial<Record<BaselineTestId, AssessmentRecord['metric']>> =
  { 'dead-hang': 'hang_duration' };

function findTest(rule: AxisRule, inputs: MovementInputs): AxisTest | null {
  const test = rule.test;
  if (!test) {
    return null;
  }
  const home = inputs.baseline.find(r => r.testId === test.id);
  if (home) {
    return {
      id: test.id,
      name: test.name,
      value: home.value,
      date: home.date,
      source: SOURCE[home.method],
      from: 'home test',
      simulated: home.sample === true,
      points: testPoints(test.marks, home.value),
      marks: test.marks,
    };
  }
  const metric = TEST_METRIC[test.id];
  const saved = (inputs.assessments ?? [])
    .filter(r => r.metric === metric && r.method === 'manual')
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
  return saved
    ? {
        id: test.id,
        name: test.name,
        value: saved.value,
        date: saved.occurredAt.slice(0, 10),
        source: 'entered',
        from: 'assessment',
        simulated: saved.simulated === true,
        points: testPoints(test.marks, saved.value),
        marks: test.marks,
      }
    : null;
}

/** Days with LONG_SESSION_CLIMBS or more logged climbs, oldest first. */
export function longSessionDays(logs: readonly ClimbLog[]): string[] {
  const perDay = new Map<string, number>();
  logs.forEach(log => perDay.set(log.date, (perDay.get(log.date) ?? 0) + 1));
  return [...perDay]
    .filter(([, n]) => n >= LONG_SESSION_CLIMBS)
    .map(([date]) => date)
    .sort();
}

function levelFor(points: number): RadarLevel {
  return points >= RADAR_LEVEL_POINTS.established
    ? 3
    : points >= RADAR_LEVEL_POINTS.building
    ? 2
    : 1;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function nextStep(
  rule: AxisRule,
  logged: number,
  scored: boolean,
  level: RadarLevel,
  points: number,
  test: AxisTest | null,
): string {
  if (!scored) {
    const missing = RADAR_MIN_CLIMBS - logged;
    const log = `log ${missing}${logged > 0 ? ' more' : ''} ${
      missing === 1 ? rule.logOne : rule.logMany
    }`;
    return rule.test
      ? `Do the ${rule.test.name} test, or ${log}, to score ${rule.name}.`
      : `${log.charAt(0).toUpperCase()}${log.slice(1)} to score ${rule.name}.`;
  }
  if (level === 3) {
    return `${rule.name} is at the top level of this chart.`;
  }
  const target =
    level === 1 ? RADAR_LEVEL_POINTS.building : RADAR_LEVEL_POINTS.established;
  const more =
    rule.test && (test?.points ?? 0) < 3
      ? `, and a longer ${rule.test.name} can add more`
      : rule.longSessions
      ? ', and so does a day with 5 or more climbs'
      : '';
  return `${plural(target - points, 'more point', 'more points')} for ${
    RADAR_LEVEL_NAME[(level + 1) as RadarLevel]
  }. Each sent ${rule.logOne} adds one${more}.`;
}

export function scoreMovementAxis(
  axis: MovementAxisId,
  inputs: MovementInputs,
): AxisScore {
  const rule = AXIS_RULES[axis];
  const climbs = inputs.logs.filter(log => matchesAxis(rule, log));
  const sent = climbs.filter(log => log.sent).length;
  const test = findTest(rule, inputs);
  const longSessions = rule.longSessions ? longSessionDays(inputs.logs) : [];
  const scored = climbs.length >= RADAR_MIN_CLIMBS || test !== null;
  const points = sent + (test?.points ?? 0) + longSessions.length;
  const level: RadarLevel = scored ? levelFor(points) : 0;
  return {
    axis,
    name: rule.name,
    scored,
    level,
    value: scored ? level / 3 : null,
    points,
    climbs,
    sent,
    test,
    longSessions,
    sample:
      climbs.some(log => log.sample) ||
      inputs.logs.some(log => log.sample && longSessions.includes(log.date)) ||
      test?.simulated === true,
    next: nextStep(rule, climbs.length, scored, level, points, test),
  };
}

/** Every axis, in chart order. */
export function movementRadar(inputs: MovementInputs): AxisScore[] {
  return MOVEMENT_AXES.map(axis => scoreMovementAxis(axis, inputs));
}

/**
 * The one step to suggest under the radar: the unscored axis closest to its
 * gate (fewest climbs missing). On a tie an axis with a home test goes first,
 * since one test is enough; then chart order. Once every axis is scored, the
 * lowest level, then the fewest points.
 */
export function radarNextStep(scores: readonly AxisScore[]): string {
  const open = scores.filter(score => !score.scored);
  const missing = (score: AxisScore) =>
    RADAR_MIN_CLIMBS - score.climbs.length - (AXIS_RULES[score.axis].test ? 0.5 : 0);
  const pick = open.length
    ? open.reduce((a, b) => (missing(b) < missing(a) ? b : a))
    : scores.reduce((a, b) =>
        b.level < a.level || (b.level === a.level && b.points < a.points)
          ? b
          : a,
      );
  return pick.next;
}
