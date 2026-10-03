/**
 * Demo data: two weeks of made-up indoor bouldering. Every log carries
 * `sample: true` so the UI can label it as an example.
 */
import type { ClimbLog, Movement, Terrain } from './climbing';
import type { GameState } from './game';

const rows: [string, Terrain, Movement, string, boolean][] = [
  ['2026-09-21', 'slab', 'controlled', 'V2', true],
  ['2026-09-21', 'slab', 'controlled', 'V3', true],
  ['2026-09-21', 'vertical', 'controlled', 'V3', false],
  ['2026-09-21', 'overhang', 'dynamic', 'V2', true],
  ['2026-09-24', 'vertical', 'dynamic', 'V3', false],
  ['2026-09-24', 'slab', 'controlled', 'V3', true],
  ['2026-09-24', 'overhang', 'dynamic', 'V3', false],
  ['2026-09-24', 'vertical', 'controlled', 'V2', true],
  ['2026-09-27', 'slab', 'dynamic', 'V3', false],
  ['2026-09-27', 'overhang', 'controlled', 'V3', true],
  ['2026-09-27', 'vertical', 'controlled', 'V3', false],
  ['2026-09-27', 'slab', 'controlled', 'V4', true],
  ['2026-09-30', 'vertical', 'dynamic', 'V2', true],
  ['2026-09-30', 'overhang', 'dynamic', 'V3', true],
  ['2026-09-30', 'vertical', 'controlled', 'V3', false],
  ['2026-09-30', 'slab', 'controlled', 'V3', true],
  ['2026-09-30', 'overhang', 'controlled', 'V4', false],
];

export const sampleLogs: readonly ClimbLog[] = rows.map(
  ([date, terrain, movement, grade, sent], i) => ({
    id: `sample-${i + 1}`,
    date,
    terrain,
    movement,
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
