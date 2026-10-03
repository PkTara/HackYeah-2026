/**
 * Everything the app remembers, and the reducer that changes it.
 * The UI derives the profile, focus, quest and monkey level from this state.
 */
import type { ClimbLog } from './climbing';

export type Side = 'left' | 'right';
export type Finger = 'thumb' | 'index' | 'middle' | 'ring' | 'little';
export const FINGERS: readonly Finger[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'little',
];

/** A finger the climber marked as sore. Their own note, not a diagnosis. */
export type HandFlag = Readonly<{
  side: Side;
  finger: Finger;
  /** When it was first flagged. Editing the spots keeps this date. */
  date: string;
  /** Where it hurts: spot ids from spots.ts. Empty means "not sure where". */
  spots: readonly string[];
}>;

export type Reach = Readonly<{
  armSpanCm: number;
  heightCm: number;
  date: string;
}>;

export type GameState = Readonly<{
  version: 1;
  logs: readonly ClimbLog[];
  flags: readonly HandFlag[];
  /** Ids of completed quests. XP is derived from these. */
  completed: readonly string[];
  /** Ids of quests the climber swapped away, oldest first. */
  skipped: readonly string[];
  reach: Reach | null;
}>;

export type GameAction =
  | { type: 'logClimb'; log: ClimbLog }
  | { type: 'removeClimb'; id: string }
  | { type: 'completeQuest'; questId: string }
  | { type: 'skipQuest'; questId: string }
  /** Explicit on/off (not a toggle) so repeating it is harmless. */
  | { type: 'setFlag'; flag: HandFlag; flagged: boolean }
  | { type: 'saveReach'; reach: Reach }
  | { type: 'load'; state: GameState }
  | { type: 'reset'; state: GameState };

export const emptyGame: GameState = {
  version: 1,
  logs: [],
  flags: [],
  completed: [],
  skipped: [],
  reach: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'logClimb':
      return { ...state, logs: [...state.logs, action.log] };
    case 'removeClimb':
      return { ...state, logs: state.logs.filter(l => l.id !== action.id) };
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
    case 'setFlag': {
      const same = (f: HandFlag) =>
        f.side === action.flag.side && f.finger === action.flag.finger;
      if (!action.flagged) {
        return { ...state, flags: state.flags.filter(f => !same(f)) };
      }
      // An edited flag keeps its place in the list; a new one goes last.
      return {
        ...state,
        flags: state.flags.some(same)
          ? state.flags.map(f => (same(f) ? action.flag : f))
          : [...state.flags, action.flag],
      };
    }
    case 'saveReach':
      return { ...state, reach: action.reach };
    case 'load':
    case 'reset':
      return action.state;
  }
}

/** Accepts saved JSON only if it looks like a GameState; otherwise null. */
export function parseGameState(json: string | null): GameState | null {
  if (!json) {
    return null;
  }
  try {
    const value = JSON.parse(json);
    const ok =
      value?.version === 1 &&
      Array.isArray(value.logs) &&
      Array.isArray(value.flags) &&
      Array.isArray(value.completed) &&
      Array.isArray(value.skipped);
    return ok
      ? { ...emptyGame, ...value, flags: value.flags.map(withSpots) }
      : null;
  } catch {
    return null;
  }
}

/** Flags saved before spots existed have none, which reads as "not sure where". */
function withSpots(flag: HandFlag): HandFlag {
  return Array.isArray(flag.spots) ? flag : { ...flag, spots: [] };
}
