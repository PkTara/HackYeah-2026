/**
 * Demo data: two weeks of made-up indoor bouldering. Every log carries
 * `sample: true` so the UI can label it as an example.
 */
import type { ClimbLog, HoldType, Movement, Terrain } from './climbing';
import type { GameState } from './game';

// Style: C controlled, D dynamic, CD both.
const STYLE: Record<string, Movement[]> = {
  C: ['controlled'],
  D: ['dynamic'],
  CD: ['controlled', 'dynamic'],
};

const rows: [string, Terrain, string, string, boolean, HoldType[]][] = [
  ['2026-09-21', 'slab', 'C', 'V2', true, ['sloper']],
  ['2026-09-21', 'slab', 'C', 'V3', true, ['crimp', 'sloper']],
  ['2026-09-21', 'vertical', 'C', 'V3', false, ['crimp']],
  ['2026-09-21', 'overhang', 'D', 'V2', true, ['jug']],
  ['2026-09-24', 'vertical', 'D', 'V3', false, ['crimp', 'pinch']],
  ['2026-09-24', 'slab', 'C', 'V3', true, ['sloper', 'volume']],
  ['2026-09-24', 'overhang', 'CD', 'V3', false, ['jug', 'pinch']],
  ['2026-09-24', 'vertical', 'C', 'V2', true, ['jug', 'crimp']],
  ['2026-09-27', 'slab', 'D', 'V3', false, ['sloper']],
  ['2026-09-27', 'overhang', 'C', 'V3', true, ['jug', 'pocket']],
  ['2026-09-27', 'vertical', 'CD', 'V3', false, ['crimp', 'pocket']],
  ['2026-09-27', 'slab', 'C', 'V4', true, ['crimp', 'sloper']],
  ['2026-09-30', 'vertical', 'D', 'V2', true, ['jug']],
  ['2026-09-30', 'overhang', 'D', 'V3', true, ['jug', 'volume']],
  ['2026-09-30', 'vertical', 'C', 'V3', false, ['crimp']],
  ['2026-09-30', 'slab', 'C', 'V3', true, ['sloper']],
  ['2026-09-30', 'overhang', 'CD', 'V4', false, ['pinch', 'crimp']],
];

export const sampleLogs: readonly ClimbLog[] = rows.map(
  ([date, terrain, style, grade, sent, holds], i) => ({
    id: `sample-${i + 1}`,
    date,
    terrain,
    movements: STYLE[style],
    holds,
    grade,
    sent,
    sample: true,
  }),
);

/** Starting point for the demo: 40 XP, one quest away from level 2. */
export const sampleGame: GameState = {
  version: 1,
  logs: sampleLogs,
  flags: [],
  completed: ['sample-onboarding', 'sample-first-log', 'sample-reach', 'sample-checkin'],
  skipped: [],
  reach: null,
};
