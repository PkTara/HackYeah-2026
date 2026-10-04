/**
 * The monkey's quest library and the rules for picking one.
 *
 * Quest text is draft content for the prototype. Practice quests need a coach
 * to review them before release (see docs/climbing-app-design.md).
 */
import type { Focus, Terrain } from './climbing';
import type { DecisionExplanation } from './evidence';

/** 'assess' only comes from a server: record a measurement. */
export type QuestKind = 'log' | 'practice' | 'plan' | 'checkin' | 'assess';

export type Quest = Readonly<{
  id: string;
  /** Authoritative server provenance, when available. */
  decision?: DecisionExplanation;
  kind: QuestKind;
  /** Which focus terrain it serves. Undefined means any. */
  terrain?: Terrain;
  title: string;
  /** What to do, in one or two sentences. */
  task: string;
  /** Why it fits the current focus. */
  why: string;
  minutes: number;
  equipment: string;
  /** Climbing or hanging. Paused while a finger is flagged. */
  loadsFingers: boolean;
  /** Only offered while a finger is flagged. */
  needsFlag?: boolean;
}>;

const TERRAIN_NAME: Record<Terrain, string> = {
  slab: 'slab',
  vertical: 'vertical',
  overhang: 'overhang',
};

function logQuest(terrain: Terrain): Quest {
  const name = TERRAIN_NAME[terrain];
  return {
    id: `log-${terrain}`,
    kind: 'log',
    terrain,
    title: `Scout the ${name}`,
    task: `Log 3 ${name} climbs next session, sent or not.`,
    why: `You have fewer than 3 ${name} climbs logged, so the app asks for more logs before comparing send shares.`,
    minutes: 20,
    equipment: 'Climbing wall',
    loadsFingers: true,
  };
}

export const QUESTS: readonly Quest[] = [
  logQuest('slab'),
  logQuest('vertical'),
  logQuest('overhang'),
  {
    id: 'vertical-quiet-feet',
    kind: 'practice',
    terrain: 'vertical',
    title: 'Quiet feet',
    task: 'Climb 4 easy vertical problems. Place every foot without a sound.',
    why: 'Vertical has your lowest logged send share. This draft explores deliberate foot placement.',
    minutes: 15,
    equipment: 'Climbing wall',
    loadsFingers: true,
  },
  {
    id: 'vertical-read',
    kind: 'plan',
    terrain: 'vertical',
    title: 'Read it first',
    task: 'Pick 2 vertical problems. Before touching the wall, point out every foothold you will use.',
    why: 'Planning feet on vertical walls is practice you can do on a rest day.',
    minutes: 5,
    equipment: 'None',
    loadsFingers: false,
  },
  {
    id: 'slab-trust',
    kind: 'practice',
    terrain: 'slab',
    title: 'Trust the rubber',
    task: 'Climb 3 easy slabs keeping your hips over your feet the whole way.',
    why: 'Slab has your lowest logged send share. This draft explores body position over your feet.',
    minutes: 15,
    equipment: 'Climbing wall',
    loadsFingers: true,
  },
  {
    id: 'slab-read',
    kind: 'plan',
    terrain: 'slab',
    title: 'Spot the smears',
    task: 'Pick 2 slabs and find where you would smear instead of using a hold.',
    why: 'Reading slab feet is practice you can do on a rest day.',
    minutes: 5,
    equipment: 'None',
    loadsFingers: false,
  },
  {
    id: 'overhang-tension',
    kind: 'practice',
    terrain: 'overhang',
    title: 'Keep feet on',
    task: 'Climb 3 easy overhangs without a foot cutting loose.',
    why: 'Overhang has your lowest logged send share. This draft explores keeping foot contact.',
    minutes: 15,
    equipment: 'Climbing wall',
    loadsFingers: true,
  },
  {
    id: 'overhang-read',
    kind: 'plan',
    terrain: 'overhang',
    title: 'Map the toe hooks',
    task: 'Pick 2 overhangs and find one heel or toe hook on each.',
    why: 'Spotting hooks on overhangs is practice you can do on a rest day.',
    minutes: 5,
    equipment: 'None',
    loadsFingers: false,
  },
  {
    id: 'finger-checkin',
    kind: 'checkin',
    title: 'Finger check-in',
    task: 'Rate how your flagged finger feels from 0 to 10 and write one line about it.',
    why: 'A quick note records what you reported today for later comparison.',
    minutes: 2,
    equipment: 'None',
    loadsFingers: false,
    needsFlag: true,
  },
];

export type QuestPick = Readonly<{
  /** The quest to show, or null when nothing is left to do. */
  quest: Quest | null;
  /** Quests that fit the focus but wait until the flagged finger is cleared. */
  paused: readonly Quest[];
  /** Every quest that could be offered right now, in order. */
  options: readonly Quest[];
}>;

/**
 * Picks the quest the monkey offers. Completed and skipped quests are left out;
 * finger-loading quests are paused while any finger is flagged.
 */
export function pickQuest(
  focus: Focus,
  opts: Readonly<{
    hasFlag: boolean;
    completed: readonly string[];
    skipped: readonly string[];
  }>,
): QuestPick {
  const fitsFocus = (q: Quest) =>
    focus.kind === 'explore'
      ? q.kind === 'log' && q.terrain === focus.terrain
      : q.kind !== 'log' &&
        (q.terrain === undefined || q.terrain === focus.terrain);

  const candidates = QUESTS.filter(
    q =>
      fitsFocus(q) &&
      !opts.completed.includes(q.id) &&
      (!q.needsFlag || opts.hasFlag),
  );
  const paused = opts.hasFlag ? candidates.filter(q => q.loadsFingers) : [];
  const eligible = candidates.filter(q => !paused.includes(q));
  // A rest-friendly check-in leads while a finger is flagged. Skipped quests
  // go to the back in the order they were skipped, so "swap" cycles.
  const skipRank = (q: Quest) => opts.skipped.indexOf(q.id);
  const options = [...eligible]
    .sort((a, b) => Number(Boolean(b.needsFlag)) - Number(Boolean(a.needsFlag)))
    .sort((a, b) => skipRank(a) - skipRank(b));

  return { quest: options[0] ?? null, paused, options };
}

export function findQuest(id: string): Quest | undefined {
  return QUESTS.find(q => q.id === id);
}
