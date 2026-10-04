import { parseAssessmentRecords, type AssessmentRecord } from './assessments';
/**
 * Everything the app remembers, and the reducer that changes it.
 * The UI derives the profile, focus, quest and monkey level from this state.
 */
import { normalizeClimbLog, type ClimbLog } from './climbing';
import {
  mergeBaseline,
  parseBaselineResults,
  parseOnboardingResult,
  type BaselineResult,
  type OnboardingResult,
} from './onboarding';
import type { Quest } from './quests';

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
  /** First-run setup answers. Null until setup is finished. */
  onboarding: OnboardingResult | null;
  /** The climber skipped setup, so the app stops asking. */
  onboardingSkipped: boolean;
  /** Latest home test result per test, from setup or the Data tab. */
  baseline: readonly BaselineResult[];
  assessments?: readonly AssessmentRecord[];
  /**
   * The quest a server picked. Undefined means the app picks one from its own
   * library (the on-device backend). Null means the server has none right now.
   */
  assigned?: Quest | null;
}>;

export type GameAction =
  | { type: 'saveAssessment'; record: AssessmentRecord }
  | { type: 'logClimb'; log: ClimbLog }
  | { type: 'removeClimb'; id: string }
  | { type: 'completeQuest'; questId: string }
  | { type: 'skipQuest'; questId: string }
  /** Explicit on/off (not a toggle) so repeating it is harmless. */
  | { type: 'setFlag'; flag: HandFlag; flagged: boolean }
  | { type: 'saveReach'; reach: Reach }
  /** Also saves the reach and the test results from setup. */
  | { type: 'finishOnboarding'; result: OnboardingResult }
  | { type: 'skipOnboarding' }
  | { type: 'saveBaseline'; result: BaselineResult }
  | { type: 'load'; state: GameState }
  | { type: 'reset'; state: GameState };

export const emptyGame: GameState = {
  version: 1,
  logs: [],
  flags: [],
  completed: [],
  skipped: [],
  reach: null,
  onboarding: null,
  onboardingSkipped: false,
  baseline: [],
  assessments: [],
};

/** A server quest that was just completed or skipped is no longer on offer. */
function dropAssigned(state: GameState, questId: string): GameState {
  return state.assigned?.id === questId ? { ...state, assigned: null } : state;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'saveAssessment':
      if (state.assessments?.some(record => record.id === action.record.id)) {
        return state;
      }
      return {
        ...state,
        assessments: [...(state.assessments ?? []), action.record],
      };
    case 'logClimb':
      return { ...state, logs: [...state.logs, action.log] };
    case 'removeClimb':
      return { ...state, logs: state.logs.filter(l => l.id !== action.id) };
    case 'completeQuest':
      if (state.completed.includes(action.questId)) {
        return state; // already counted, no double XP
      }
      return dropAssigned(
        {
          ...state,
          completed: [...state.completed, action.questId],
          skipped: state.skipped.filter(id => id !== action.questId),
        },
        action.questId,
      );
    case 'skipQuest':
      return dropAssigned(
        {
          ...state,
          skipped: [
            ...state.skipped.filter(id => id !== action.questId),
            action.questId,
          ],
        },
        action.questId,
      );
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
    case 'finishOnboarding': {
      const { body } = action.result.details;
      return {
        ...state,
        onboarding: action.result,
        onboardingSkipped: false,
        reach: body ? { ...body, date: action.result.date } : state.reach,
        // Tests skipped this time keep their earlier results.
        baseline: mergeBaseline(state.baseline, action.result.baseline),
      };
    }
    case 'skipOnboarding':
      return { ...state, onboardingSkipped: true };
    case 'saveBaseline':
      return {
        ...state,
        baseline: mergeBaseline(state.baseline, [action.result]),
      };
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
    if (!ok) {
      return null;
    }
    const saved: GameState = {
      ...emptyGame,
      ...value,
      logs: value.logs.map(normalizeClimbLog),
      flags: value.flags.map(withSpots),
      onboarding: parseOnboardingResult(value.onboarding),
      onboardingSkipped: value.onboardingSkipped === true,
      baseline: parseBaselineResults(value.baseline),
      assessments: parseAssessmentRecords(value.assessments),
    };
    // Only a server picks quests, and it is asked again on every load.
    delete (saved as { assigned?: unknown }).assigned;
    return saved;
  } catch {
    return null;
  }
}

/** Flags saved before spots existed have none, which reads as "not sure where". */
function withSpots(flag: HandFlag): HandFlag {
  return Array.isArray(flag.spots) ? flag : { ...flag, spots: [] };
}
