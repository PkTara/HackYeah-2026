/**
 * Everything gazelle mode remembers, and the reducer that changes it.
 * Kept apart from the monkey's GameState so the two pets never mix XP.
 */
import type { LegFlag, RunLog, RunType, Surface } from './running';

export type RunState = Readonly<{
  version: 1;
  runs: readonly RunLog[];
  legFlags: readonly LegFlag[];
  /** Ids of completed gazelle quests. Gazelle XP is derived from these. */
  completed: readonly string[];
  /** Ids of quests the runner swapped away, oldest first. */
  skipped: readonly string[];
}>;

export type RunAction =
  | { type: 'logRun'; run: RunLog }
  | { type: 'removeRun'; id: string }
  | { type: 'completeQuest'; questId: string }
  | { type: 'skipQuest'; questId: string }
  /** Explicit on/off (not a toggle) so repeating it is harmless. */
  | { type: 'setLegFlag'; flag: LegFlag; flagged: boolean }
  | { type: 'load'; state: RunState }
  | { type: 'reset'; state: RunState };

export const emptyRun: RunState = {
  version: 1,
  runs: [],
  legFlags: [],
  completed: [],
  skipped: [],
};

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'logRun':
      return { ...state, runs: [...state.runs, action.run] };
    case 'removeRun':
      return { ...state, runs: state.runs.filter(r => r.id !== action.id) };
    case 'completeQuest':
      if (state.completed.includes(action.questId)) {
        return state; // already counted, no double XP
      }
      return {
        ...state,
        completed: [...state.completed, action.questId],
        skipped: state.skipped.filter(id => id !== action.questId),
      };
    case 'skipQuest':
      return {
        ...state,
        skipped: [
          ...state.skipped.filter(id => id !== action.questId),
          action.questId,
        ],
      };
    case 'setLegFlag': {
      const same = (f: LegFlag) =>
        f.side === action.flag.side && f.part === action.flag.part;
      if (!action.flagged) {
        return { ...state, legFlags: state.legFlags.filter(f => !same(f)) };
      }
      if (state.legFlags.some(same)) {
        return state; // keeps the date it was first flagged
      }
      return { ...state, legFlags: [...state.legFlags, action.flag] };
    }
    case 'load':
    case 'reset':
      return action.state;
  }
}

/** Accepts saved JSON only if it looks like a RunState; otherwise null. */
export function parseRunState(json: string | null): RunState | null {
  if (!json) {
    return null;
  }
  try {
    const value = JSON.parse(json);
    const ok =
      value?.version === 1 &&
      Array.isArray(value.runs) &&
      Array.isArray(value.legFlags) &&
      Array.isArray(value.completed) &&
      Array.isArray(value.skipped);
    return ok ? { ...emptyRun, ...value } : null;
  } catch {
    return null;
  }
}

// Demo data: two weeks of made-up running. Every run carries `sample: true`
// so the UI can label it as an example.
const rows: [string, RunType, Surface, number, number, boolean][] = [
  ['2026-09-20', 'easy', 'road', 5, 31, true],
  ['2026-09-21', 'tempo', 'track', 6, 32, false],
  ['2026-09-22', 'long', 'trail', 12, 78, true],
  ['2026-09-24', 'easy', 'road', 4.5, 28, true],
  ['2026-09-25', 'tempo', 'road', 6, 31, true],
  ['2026-09-27', 'long', 'road', 14, 92, false],
  ['2026-09-28', 'easy', 'trail', 6, 40, false],
  ['2026-09-29', 'tempo', 'track', 7, 37, false],
  ['2026-09-30', 'easy', 'road', 5, 30, true],
  ['2026-10-01', 'tempo', 'road', 6.5, 34, true],
  ['2026-10-02', 'long', 'trail', 15, 101, true],
  ['2026-10-02', 'easy', 'road', 3, 19, true],
];

export const sampleRuns: readonly RunLog[] = rows.map(
  ([date, type, surface, km, minutes, finished], i) => ({
    id: `sample-run-${i + 1}`,
    date,
    type,
    surface,
    km,
    minutes,
    finished,
    sample: true,
  }),
);

/** Starting point for the demo: 20 XP, three quests from level 2. */
export const sampleRunGame: RunState = {
  version: 1,
  runs: sampleRuns,
  legFlags: [],
  completed: ['sample-run-first-log', 'sample-run-shoes'],
  skipped: [],
};
