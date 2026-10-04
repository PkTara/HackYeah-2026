/** Words and states for the export tests, one per mode. */
import {
  RUNNING,
  SWIMMING,
  buildClimbingSnapshot,
  buildSportSnapshot,
  sampleGame,
  type ExportMode,
  type ExportSnapshot,
  type GameState,
  type ModeWords,
  type PeriodWeeks,
  type SportState,
} from '../..';

export const TODAY = '2026-10-04';

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const CLIMB_WORDS: ModeWords = {
  modeName: 'Climbing',
  pet: 'monkey',
  session: 'climb',
  sessions: 'climbs',
  unit: '',
  doneWord: 'sent',
  notDoneWord: 'not sent',
  kindLabel: 'Wall',
  placeLabel: 'Place',
  kindName: { slab: 'Slab', vertical: 'Vertical', overhang: 'Overhang' },
  placeName: {},
  bodyPartName: {},
  bodyTab: 'Hands',
  pausedWhat: 'quests that load the fingers, such as climbing or hanging',
  logHow:
    'I tapped in the wall, style, holds, grade and whether I sent it after each climb.',
  flagWhere: (side, part) =>
    `${cap(side)} ${part}${part === 'thumb' ? '' : ' finger'}`,
};

export const RUN_WORDS: ModeWords = {
  modeName: 'Running',
  pet: 'gazelle',
  session: 'run',
  sessions: 'runs',
  unit: 'km',
  doneWord: 'finished',
  notDoneWord: 'cut short',
  kindLabel: 'Run type',
  placeLabel: 'Ground',
  kindName: { easy: 'Easy', tempo: 'Tempo', long: 'Long' },
  placeName: { road: 'Road', trail: 'Trail', track: 'Track' },
  bodyPartName: { knee: 'Knee', hip: 'Hip' },
  bodyTab: 'Legs',
  pausedWhat: 'quests that mean running',
  logHow:
    'I tapped in the run type, ground, distance and time after each run.',
  flagWhere: (side, part) => `${cap(side)} ${part}`,
};

export const SWIM_WORDS: ModeWords = {
  ...RUN_WORDS,
  modeName: 'Swimming',
  pet: 'dolphin',
  session: 'swim',
  sessions: 'swims',
  unit: 'm',
  kindLabel: 'Stroke',
  placeLabel: 'Water',
  kindName: { free: 'Free', breast: 'Breast', back: 'Back' },
  placeName: { pool: 'Pool', lake: 'Lake', sea: 'Sea' },
  bodyPartName: { shoulder: 'Shoulder' },
  bodyTab: 'Body',
  pausedWhat: 'quests that mean swimming',
  logHow: 'I tapped in the stroke, water, distance and time after each swim.',
};

/** A climber with a sore finger, a camera reading and a force reading. */
export const CLIMBER: GameState = {
  ...sampleGame,
  logs: sampleGame.logs.map(log => ({ ...log, sample: undefined })),
  flags: [{ side: 'right', finger: 'ring', date: '2026-09-27', spots: ['a2'] }],
  assessments: [
    {
      id: 'force-1',
      metric: 'finger_force',
      value: 170,
      unit: 'N',
      method: 'manual',
      protocol: 'max-pull-v1',
      occurredAt: '2026-09-01T10:00:00Z',
      side: 'right',
      setup: {
        instrument: 'Tindeq',
        grip: 'half_crimp',
        edge_mm: 20,
        arm_position: 'bent',
        effort_seconds: 7,
      },
    },
    {
      id: 'force-2',
      metric: 'finger_force',
      value: 180,
      unit: 'N',
      method: 'manual',
      protocol: 'max-pull-v1',
      occurredAt: '2026-10-01T10:00:00Z',
      side: 'right',
      setup: {
        instrument: 'Tindeq',
        grip: 'half_crimp',
        edge_mm: 20,
        arm_position: 'bent',
        effort_seconds: 7,
      },
    },
    {
      id: 'cam-1',
      metric: 'leg_spread',
      value: 120,
      unit: 'degrees',
      method: 'camera',
      protocol: 'front-facing-straddle-v1',
      occurredAt: '2026-10-02T10:00:00Z',
      confidence: 0.9,
    },
  ],
  baseline: [
    {
      testId: 'dead-hang',
      value: 35,
      unit: 'seconds',
      method: 'stopwatch',
      date: '2026-09-30',
    },
  ],
  onboarding: {
    version: 1,
    date: '2026-09-20',
    details: {
      places: ['bouldering-gym'],
      experience: '2-to-5-years',
      grade: 'V3',
      goal: 'finger-strength',
      body: null,
    },
    connections: [],
    baseline: [],
    skippedTests: ['plank'],
  },
};

/** A runner with a sore knee, all logs their own. */
export const RUNNER: SportState = {
  ...RUNNING.sample,
  logs: RUNNING.sample.logs.map(log => ({ ...log, sample: undefined })),
  flags: [{ side: 'left', part: 'knee', date: '2026-09-27' }],
};

export function snapshotFor(
  mode: ExportMode,
  opts: Partial<{
    weeks: PeriodWeeks;
    demoProfile: boolean;
    sample: boolean;
    game: GameState;
    sport: SportState;
  }> = {},
): ExportSnapshot {
  const base = {
    today: TODAY,
    weeks: opts.weeks === undefined ? 4 : opts.weeks,
    demoProfile: opts.demoProfile ?? false,
  };
  if (mode === 'climb') {
    return buildClimbingSnapshot(
      opts.game ?? (opts.sample ? sampleGame : CLIMBER),
      CLIMB_WORDS,
      base,
    );
  }
  const sport = mode === 'run' ? RUNNING : SWIMMING;
  const fallback =
    mode === 'run'
      ? RUNNER
      : {
          ...SWIMMING.sample,
          logs: SWIMMING.sample.logs.map(log => ({ ...log, sample: undefined })),
          flags: [{ side: 'right' as const, part: 'shoulder', date: '2026-09-28' }],
        };
  return buildSportSnapshot(
    sport,
    opts.sport ?? (opts.sample ? sport.sample : fallback),
    mode === 'run' ? RUN_WORDS : SWIM_WORDS,
    base,
  );
}
