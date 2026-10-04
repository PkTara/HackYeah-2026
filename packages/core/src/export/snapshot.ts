/**
 * The only place that knows the shape of each mode's state. It copies the
 * fields an export may show into one ExportSnapshot and nothing else, so
 * extra fields on a state (an email, a token) can never leak into a file.
 */
import {
  comparableAssessments,
  type AssessmentRecord,
} from '../assessments';
import { pickFocus } from '../climbing';
import { explainFocus, explainSportFocus } from '../evidence';
import type { GameState } from '../game';
import {
  BASELINE_TESTS,
  EXPERIENCE_LABEL,
  GOAL_LABEL,
  PLACE_LABEL,
  formatResult,
  gradeLabel,
  type BaselineResult,
} from '../onboarding';
import { petStatus } from '../progress';
import { pickQuest } from '../quests';
import { markedSpots } from '../spots';
import {
  pickSportFocus,
  pickSportQuest,
  type Sport,
  type SportState,
} from '../sport';
import { addDays, daysBetween, inRange } from './stats';
import type {
  ExportFlag,
  ExportMeasurement,
  ExportMode,
  ExportSession,
  ExportSnapshot,
  ModeWords,
  PeriodWeeks,
  Provenance,
} from './types';

export type OtherSportInput = Readonly<{
  modeName: string;
  session: string;
  sessions: string;
  /** One date per logged session. */
  dates: readonly string[];
  /** Any of those sessions is example data. */
  example: boolean;
}>;

export type SnapshotOptions = Readonly<{
  today: string;
  weeks: PeriodWeeks;
  /** The demo profile is on: every record is made up. */
  demoProfile: boolean;
  /** Other modes to mention in one line each, when asked for. */
  otherSports?: readonly OtherSportInput[];
}>;

/** Newest first; same-day sessions keep the order they were logged, newest first. */
function newestFirst(sessions: readonly ExportSession[]): ExportSession[] {
  return [...sessions].reverse().sort((a, b) => b.date.localeCompare(a.date));
}

function periodOf(
  all: readonly ExportSession[],
  opts: SnapshotOptions,
): ExportSnapshot['period'] {
  const to = opts.today;
  if (opts.weeks !== null) {
    return { from: addDays(to, -(opts.weeks * 7 - 1)), to, weeks: opts.weeks };
  }
  const dates = all.map(s => s.date).filter(d => d <= to);
  const earliest = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : to;
  return { from: earliest, to, weeks: null };
}

function others(
  period: ExportSnapshot['period'],
  inputs: readonly OtherSportInput[] = [],
): ExportSnapshot['otherSports'] {
  return inputs.map(o => {
    const dates = o.dates.filter(d => inRange(d, period.from, period.to));
    return {
      modeName: o.modeName,
      session: o.session,
      sessions: o.sessions,
      count: dates.length,
      activeDays: new Set(dates).size,
      provenance: o.example ? ('example' as const) : ('entered' as const),
    };
  });
}

function finish(
  mode: ExportMode,
  words: ModeWords,
  opts: SnapshotOptions,
  rest: Omit<
    ExportSnapshot,
    | 'schema'
    | 'generatedOn'
    | 'mode'
    | 'words'
    | 'demoProfile'
    | 'containsExamples'
    | 'period'
    | 'sessions'
    | 'otherSports'
  >,
): ExportSnapshot {
  const allSessions = newestFirst(rest.allSessions).filter(
    s => s.date <= opts.today,
  );
  const period = periodOf(allSessions, opts);
  const sessions = allSessions.filter(s =>
    inRange(s.date, period.from, period.to),
  );
  return {
    schema: 'climbing-monkey-export/1',
    generatedOn: opts.today,
    mode,
    words,
    demoProfile: opts.demoProfile,
    containsExamples:
      opts.demoProfile ||
      allSessions.some(s => s.provenance === 'example') ||
      rest.flags.some(f => f.provenance === 'example') ||
      rest.measurements.some(m => m.provenance === 'example'),
    period,
    ...rest,
    allSessions,
    sessions,
    otherSports: others(period, opts.otherSports),
  };
}

const METRIC_NAME: Readonly<Record<AssessmentRecord['metric'], string>> = {
  leg_spread: 'Leg spread',
  shoulder_reach_left: 'Shoulder reach, left',
  shoulder_reach_right: 'Shoulder reach, right',
  finger_force: 'Finger strength',
  height: 'Height',
  arm_span: 'Arm span',
  pullups: 'Pull-ups',
  hang_duration: 'Dead hang',
};

const UNIT_WORD: Readonly<Record<AssessmentRecord['unit'], string>> = {
  degrees: 'degrees',
  cm: 'cm',
  repetitions: 'reps',
  seconds: 's',
  N: 'N',
  kgf: 'kgf',
};

const GRIP: Readonly<Record<string, string>> = {
  open_hand: 'open hand',
  half_crimp: 'half crimp',
  full_crimp: 'full crimp',
};

function assessmentProvenance(record: AssessmentRecord, demo: boolean) {
  if (record.simulated || demo) {
    return 'example' as const;
  }
  if (record.method === 'camera') {
    return 'camera_estimate' as const;
  }
  // Counts and holds typed in are the person's own numbers; lengths, angles
  // and forces came from their own tape, gauge or goniometer.
  return record.metric === 'pullups' || record.metric === 'hang_duration'
    ? ('entered' as const)
    : ('measured_tool' as const);
}

function assessmentRows(
  records: readonly AssessmentRecord[],
  demo: boolean,
): ExportMeasurement[] {
  return comparableAssessments(records).map(({ latest, previous }) => {
    const setup = latest.setup
      ? `${GRIP[latest.setup.grip] ?? latest.setup.grip}, ${
          latest.setup.edge_mm
        } mm edge, ${latest.setup.arm_position} arm, ${
          latest.setup.effort_seconds
        } s effort, measured with: ${latest.setup.instrument.trim()}`
      : null;
    const provenance = assessmentProvenance(latest, demo);
    return {
      id: latest.id,
      date: latest.occurredAt.slice(0, 10),
      metric: latest.metric,
      name: METRIC_NAME[latest.metric],
      value: latest.value,
      unit: latest.unit,
      display: `${latest.value} ${UNIT_WORD[latest.unit]}`,
      method:
        latest.method === 'camera'
          ? 'camera estimate'
          : provenance === 'measured_tool'
          ? 'typed in from my own tool'
          : 'typed in',
      protocol: latest.protocol,
      side: latest.side ?? null,
      setup,
      previous: previous
        ? { date: previous.occurredAt.slice(0, 10), value: previous.value }
        : null,
      provenance,
    };
  });
}

const BASELINE_METHOD: Readonly<Record<BaselineResult['method'], string>> = {
  stopwatch: 'stopwatch in the app',
  counter: 'counter in the app',
  typed: 'typed in',
};

function baselineRows(
  results: readonly BaselineResult[],
  demo: boolean,
): ExportMeasurement[] {
  return BASELINE_TESTS.flatMap(test => {
    const r = results.find(result => result.testId === test.id);
    if (!r) {
      return [];
    }
    const provenance: Provenance = demo
      ? 'example'
      : r.method === 'typed'
      ? 'entered'
      : 'timed_in_app';
    return [
      {
        id: `home-test-${test.id}`,
        date: r.date,
        metric: test.id,
        name: test.name,
        value: r.value,
        unit: r.unit,
        display: formatResult(r.unit, r.value),
        method: BASELINE_METHOD[r.method],
        protocol: null,
        side: null,
        setup: null,
        previous: null,
        provenance,
      },
    ];
  });
}

export function buildClimbingSnapshot(
  game: GameState,
  words: ModeWords,
  opts: SnapshotOptions,
): ExportSnapshot {
  const demo = opts.demoProfile;
  const sessions: ExportSession[] = game.logs.map(log => ({
    id: log.id,
    date: log.date,
    kind: log.terrain,
    place: null,
    distance: null,
    unit: null,
    minutes: null,
    pace: null,
    done: log.sent,
    grade: log.grade?.trim() || null,
    styles: [...log.movements],
    holds: [...log.holds],
    provenance: log.sample || demo ? 'example' : 'entered',
  }));
  const flags: ExportFlag[] = game.flags.map(flag => ({
    side: flag.side,
    part: flag.finger,
    where: words.flagWhere(flag.side, flag.finger),
    spots: markedSpots(flag.finger, flag.spots).map(
      spot => `${spot.name} (${spot.detail})`,
    ),
    since: flag.date,
    days: daysBetween(flag.date, opts.today) - 1,
    provenance: demo ? 'example' : 'entered',
  }));
  const assessments = game.assessments ?? [];
  const typedBody = assessments.some(
    a => a.metric === 'height' || a.metric === 'arm_span',
  );
  const reach: ExportMeasurement[] =
    game.reach && !typedBody
      ? (
          [
            ['height', 'Height', game.reach.heightCm],
            ['arm_span', 'Arm span', game.reach.armSpanCm],
          ] as const
        ).map(([metric, name, value]) => ({
          id: `reach-${metric}`,
          date: game.reach!.date,
          metric,
          name,
          value,
          unit: 'cm',
          display: `${value} cm`,
          method: 'typed in from my own tool',
          protocol: null,
          side: null,
          setup: null,
          previous: null,
          provenance: demo ? 'example' : 'measured_tool',
        }))
      : [];
  const focus = pickFocus(game.logs);
  const explained = explainFocus(focus, game.logs);
  const pick =
    game.assigned !== undefined
      ? { quest: game.assigned, paused: [] }
      : pickQuest(focus, {
          hasFlag: game.flags.length > 0,
          completed: game.completed,
          skipped: game.skipped,
        });
  const details = game.onboarding?.details;
  const pet = petStatus(game.completed);
  return finish('climb', words, opts, {
    allSessions: sessions,
    kinds: ['slab', 'vertical', 'overhang'],
    flags,
    measurements: [
      ...assessmentRows(assessments, demo),
      ...reach,
      ...baselineRows(game.baseline, demo),
    ],
    about: details
      ? {
          experience: EXPERIENCE_LABEL[details.experience],
          usualGrade: gradeLabel(details.grade),
          goal: GOAL_LABEL[details.goal],
          places: details.places.map(p => PLACE_LABEL[p]),
          skippedTests: (game.onboarding?.skippedTests ?? []).map(
            id => BASELINE_TESTS.find(t => t.id === id)?.name ?? id,
          ),
        }
      : null,
    focus: {
      name: words.kindName[focus.terrain] ?? focus.terrain,
      kind: focus.kind,
      summary: explained.summary,
      rule: explained.rule.split('\n').filter(Boolean),
      limitations: explained.limitations,
    },
    quest: pick.quest
      ? {
          id: pick.quest.id,
          title: pick.quest.title,
          task: pick.quest.task,
          minutes: pick.quest.minutes,
          draft: pick.quest.kind === 'practice' || pick.quest.kind === 'plan',
        }
      : null,
    paused: pick.paused.map(q => q.title),
    progress: {
      level: pet.level,
      xp: pet.xp,
      completedQuestIds: [...new Set(game.completed)],
    },
  });
}

export function buildSportSnapshot(
  sport: Sport,
  state: SportState,
  words: ModeWords,
  opts: SnapshotOptions,
): ExportSnapshot {
  const demo = opts.demoProfile;
  const sessions: ExportSession[] = state.logs.map(log => ({
    id: log.id,
    date: log.date,
    kind: log.kind,
    place: log.place,
    distance: log.distance,
    unit: sport.unit,
    minutes: log.minutes,
    pace: sport.pace(log.distance, log.minutes),
    done: log.finished,
    grade: null,
    styles: [],
    holds: [],
    provenance: log.sample || demo ? 'example' : 'entered',
  }));
  const flags: ExportFlag[] = state.flags.map(flag => ({
    side: flag.side,
    part: flag.part,
    where: words.flagWhere(flag.side, flag.part),
    spots: [],
    since: flag.date,
    days: daysBetween(flag.date, opts.today) - 1,
    provenance: demo ? 'example' : 'entered',
  }));
  const focus = pickSportFocus(state.logs, sport.kinds);
  const explained = explainSportFocus(focus, state.logs, sport.kinds, words);
  const pick = pickSportQuest(sport.quests, focus, {
    hasFlag: state.flags.length > 0,
    completed: state.completed,
    skipped: state.skipped,
  });
  const pet = petStatus(state.completed, sport.unlocks);
  return finish(sport.id, words, opts, {
    allSessions: sessions,
    kinds: sport.kinds,
    flags,
    measurements: [],
    about: null,
    focus: {
      name: words.kindName[focus.sessionKind] ?? focus.sessionKind,
      kind: focus.kind,
      summary: explained.summary,
      rule: explained.rule.split('\n').filter(Boolean),
      limitations: explained.limitations,
    },
    quest: pick.quest
      ? {
          id: pick.quest.id,
          title: pick.quest.title,
          task: pick.quest.task,
          minutes: pick.quest.minutes,
          draft: pick.quest.kind === 'practice' || pick.quest.kind === 'plan',
        }
      : null,
    paused: pick.paused.map(q => q.title),
    progress: {
      level: pet.level,
      xp: pet.xp,
      completedQuestIds: [...new Set(state.completed)],
    },
  });
}
