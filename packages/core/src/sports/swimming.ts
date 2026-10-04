/**
 * Dolphin mode: swimming. Freestyle, breaststroke and backstroke in a pool,
 * a lake or the sea, distances in metres. Quest text is draft content for
 * the prototype; practice quests need a coach to review them before release.
 */
import { DOLPHIN_COSMETICS } from '../progress';
import { clock, sampleSessions, type Sport, type SportQuest } from '../sport';

const STROKE: Record<string, string> = {
  free: 'freestyle',
  breast: 'breaststroke',
  back: 'backstroke',
};

function logQuest(kind: string): SportQuest {
  const name = STROKE[kind];
  return {
    id: `swim-log-${kind}`,
    kind: 'log',
    sessionKind: kind,
    title: `Try some ${name}`,
    task: `Log 3 swims that are mostly ${name} this week, finished or not.`,
    why: `You have fewer than 3 ${name} swims logged, so there is nothing to compare yet.`,
    minutes: 30,
    equipment: 'Pool, goggles',
    loadsBody: true,
  };
}

const QUESTS: readonly SportQuest[] = [
  logQuest('free'),
  logQuest('breast'),
  logQuest('back'),
  {
    id: 'free-breathe-three',
    kind: 'practice',
    sessionKind: 'free',
    title: 'Breathe every three',
    task: 'Swim 6 x 50 m freestyle, breathing every third stroke, with 30 seconds rest between.',
    why: 'Freestyle is your lowest finish rate. Breathing to both sides keeps the stroke even and less tiring.',
    minutes: 20,
    equipment: 'Pool, goggles',
    loadsBody: true,
  },
  {
    id: 'free-count',
    kind: 'plan',
    sessionKind: 'free',
    title: 'Count your strokes',
    task: 'Next time you are at the pool, count your strokes for one easy length and write the number down.',
    why: 'Fewer strokes per length usually means a longer glide. One number gives you something to beat.',
    minutes: 5,
    equipment: 'None',
    loadsBody: false,
  },
  {
    id: 'breast-glide',
    kind: 'practice',
    sessionKind: 'breast',
    title: 'Glide for two',
    task: 'Swim 6 x 25 m breaststroke. After every kick, hold the glide for a count of two.',
    why: 'Breaststroke is your lowest finish rate. A real glide saves energy on every stroke.',
    minutes: 15,
    equipment: 'Pool',
    loadsBody: true,
  },
  {
    id: 'breast-kick',
    kind: 'plan',
    sessionKind: 'breast',
    title: 'Watch the kick',
    task: 'Watch one short breaststroke kick video and pick a single thing to try next swim.',
    why: 'The kick does most of the work in breaststroke. One clear cue is easier to try than five.',
    minutes: 5,
    equipment: 'Phone',
    loadsBody: false,
  },
  {
    id: 'back-still-head',
    kind: 'practice',
    sessionKind: 'back',
    title: 'Still head',
    task: 'Swim 6 x 25 m backstroke with your eyes on the ceiling and your head still, 30 seconds rest between.',
    why: 'Backstroke is your lowest finish rate. A still head keeps your hips up so it feels easier.',
    minutes: 15,
    equipment: 'Pool',
    loadsBody: true,
  },
  {
    id: 'back-flags',
    kind: 'plan',
    sessionKind: 'back',
    title: 'Find the flags',
    task: 'Check how far the backstroke flags are from the wall at your pool, then count strokes from the flags in your head.',
    why: 'Knowing your stroke count from the flags means no more bumping into the wall.',
    minutes: 5,
    equipment: 'None',
    loadsBody: false,
  },
  {
    id: 'swim-checkin',
    kind: 'checkin',
    title: 'Body check-in',
    task: 'Rate how your flagged spot feels from 0 to 10 when you move it gently and write one line about it.',
    why: 'A quick note now makes it easier to see if it is getting better.',
    minutes: 2,
    equipment: 'None',
    loadsBody: false,
    needsFlag: true,
  },
];

// Demo data: two weeks of made-up swimming.
const rows: (readonly [string, string, string, number, number, boolean])[] = [
  ['2026-09-20', 'free', 'pool', 1000, 25, true],
  ['2026-09-21', 'breast', 'pool', 600, 20, true],
  ['2026-09-22', 'back', 'pool', 400, 14, false],
  ['2026-09-24', 'free', 'lake', 1500, 40, true],
  ['2026-09-25', 'breast', 'pool', 800, 25, false],
  ['2026-09-27', 'free', 'pool', 1200, 30, false],
  ['2026-09-28', 'back', 'pool', 500, 16, true],
  ['2026-09-29', 'breast', 'sea', 700, 25, true],
  ['2026-09-30', 'free', 'pool', 1000, 24, true],
  ['2026-10-01', 'back', 'pool', 400, 13, false],
  ['2026-10-02', 'breast', 'pool', 600, 19, true],
  ['2026-10-02', 'free', 'sea', 800, 22, true],
];

export const SWIMMING: Sport = {
  id: 'swim',
  pet: 'dolphin',
  kinds: ['free', 'breast', 'back'],
  places: ['pool', 'lake', 'sea'],
  bodyParts: ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'],
  unit: 'm',
  quests: QUESTS,
  unlocks: DOLPHIN_COSMETICS,
  // 30 XP to start, two quests from level 2.
  sample: {
    version: 1,
    logs: sampleSessions('sample-swim', rows),
    flags: [],
    completed: [
      'sample-swim-first-log',
      'sample-swim-goggles',
      'sample-swim-pool',
    ],
    skipped: [],
  },
  pace: (metres, minutes) =>
    metres > 0 && minutes > 0
      ? `${clock((minutes * 60 * 100) / metres)} /100 m`
      : null,
};
