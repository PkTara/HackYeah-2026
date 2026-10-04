import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  COSMETICS,
  emptyGame,
  gameReducer,
  petStatus,
  pickFocus,
  pickQuest,
  toLocalDate,
  type AssessmentRecord,
  type BaselineResult,
  type ClimbLog,
  type Finger,
  type Focus,
  type GameAction,
  type GameState,
  type HandFlag,
  type OnboardingResult,
  type PetStatus,
  type QuestPick,
  type Reach,
  type Side,
} from '@hackyeah/core';
import type { ClimbingBackend } from '@hackyeah/data';

export type Celebration = Readonly<{
  id: number;
  xp: number;
  /** Set when the quest pushed the monkey to a new level. */
  level: number | null;
  /** Name of the cosmetic unlocked at that level, if any. */
  unlocked: string | null;
}>;

type GameApi = Readonly<{
  /** 'loading' until the backend answers the first time. */
  status: 'loading' | 'ready' | 'error';
  /** Set when a change could not be saved; the screen shows the saved state. */
  syncError: string | null;
  dismissSyncError: () => void;
  retry: () => void;
  /** Reads the saved state again, without the loading screen (after the camera saved a hand report). */
  refresh: () => void;
  backendKind: ClimbingBackend['kind'];

  state: GameState;
  today: string;
  focus: Focus;
  quest: QuestPick;
  pet: PetStatus;
  celebration: Celebration | null;
  dismissCelebration: () => void;

  completeQuest: (id: string) => void;
  skipQuest: (id: string) => void;
  logClimb: (log: Omit<ClimbLog, 'id' | 'date'>) => void;
  removeClimb: (id: string) => void;
  /**
   * Flags a finger with exactly these spots (ids from core's spots.ts).
   * An empty list means sore, not sure where. A finger that was already
   * flagged keeps the date it was first flagged.
   */
  setFingerSpots: (
    side: Side,
    finger: Finger,
    spots: readonly string[],
  ) => void;
  /** Removes a finger's flag and its spots. */
  clearFinger: (side: Side, finger: Finger) => void;
  /** Flags a finger with no spots, or clears it if it is flagged. */
  toggleFlag: (side: Side, finger: Finger) => void;
  saveReach: (reach: Omit<Reach, 'date'>) => void;
  /** Saves first-run setup (and its reach, if given). */
  finishOnboarding: (result: OnboardingResult) => void;
  /** Setup was skipped: stop asking on launch. */
  skipOnboarding: () => void;
  /** One home test done from the Tests tab. */
  saveBaseline: (result: BaselineResult) => void;
  saveAssessment: (record: AssessmentRecord) => Promise<void>;
  /**
   * Deletes the whole profile, then setup runs again. Not resetDemo: no
   * example data comes back. If it fails, the screen keeps what it shows.
   */
  resetProfile: () => void;
  resetDemo: () => void;
}>;

const GameContext = createContext<GameApi | null>(null);

export function useGame(): GameApi {
  const api = useContext(GameContext);
  if (!api) {
    throw new Error('useGame must be used inside <GameProvider>');
  }
  return api;
}

type Props = {
  children: ReactNode;
  backend: ClimbingBackend;
  /** Fixed date for tests; defaults to the device's local date. */
  today?: string;
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Holds what the screens show and keeps it in step with the backend.
 *
 * Every change is applied on screen first, then sent to the backend. If the
 * backend says no, the provider reloads the saved state and shows a notice.
 * Screens only use useGame(); they never see the backend.
 */
export function GameProvider({ children, backend, today: fixedToday }: Props) {
  const [state, dispatch] = useReducer(gameReducer, emptyGame);
  const [status, setStatus] = useState<GameApi['status']>('loading');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const today = fixedToday ?? toLocalDate(new Date());
  const celebrationId = useRef(1);

  const reload = useCallback(async () => {
    try {
      dispatch({ type: 'load', state: await backend.load() });
      setStatus('ready');
    } catch {
      setStatus(s => (s === 'ready' ? s : 'error'));
    }
  }, [backend]);

  useEffect(() => {
    reload();
  }, [reload]);

  // A backend may answer a save with a fresh state (a server that picks the
  // next quest). It is only shown once no other change is still saving, so it
  // cannot hide a change made after it; otherwise the app reloads at the end.
  const saving = useRef(0);
  const reloadWhenIdle = useRef(false);

  /** Show the change now, then save it. */
  const commit = useCallback(
    (
      action: GameAction,
      save: () => Promise<GameState | void>,
      propagate = false,
    ) => {
      dispatch(action);
      saving.current += 1;
      const pending = save().then(
        fresh => {
          saving.current -= 1;
          setSyncError(null);
          const idle = saving.current === 0;
          if (fresh && idle) {
            reloadWhenIdle.current = false;
            dispatch({ type: 'load', state: fresh });
          } else if (fresh || (idle && reloadWhenIdle.current)) {
            reloadWhenIdle.current = !idle;
            if (idle) {
              reload();
            }
          }
        },
        error => {
          saving.current -= 1;
          setSyncError(
            'Could not save that change. Showing your last saved data.',
          );
          reload();
          if (propagate) {
            throw error;
          }
        },
      );
      return propagate ? pending : undefined;
    },
    [reload],
  );

  const focus = useMemo(() => pickFocus(state.logs), [state.logs]);
  const quest = useMemo<QuestPick>(
    () =>
      // A server that picks quests decides alone; otherwise use the library.
      state.assigned !== undefined
        ? {
            quest: state.assigned,
            paused: [],
            options: state.assigned ? [state.assigned] : [],
          }
        : pickQuest(focus, {
            hasFlag: state.flags.length > 0,
            completed: state.completed,
            skipped: state.skipped,
          }),
    [focus, state.assigned, state.flags, state.completed, state.skipped],
  );
  const pet = useMemo(() => petStatus(state.completed), [state.completed]);

  const completeQuest = useCallback(
    (id: string) => {
      if (state.completed.includes(id)) {
        return;
      }
      const before = petStatus(state.completed);
      const after = petStatus([...state.completed, id]);
      const levelUp = after.level > before.level ? after.level : null;
      setCelebration({
        id: celebrationId.current++,
        xp: after.xp - before.xp,
        level: levelUp,
        unlocked: levelUp
          ? COSMETICS.find(c => c.level === levelUp)?.name ?? null
          : null,
      });
      commit({ type: 'completeQuest', questId: id }, () =>
        backend.completeQuest(id),
      );
    },
    [state.completed, commit, backend],
  );

  const setFingerSpots = useCallback(
    (side: Side, finger: Finger, spots: readonly string[]) => {
      const old = state.flags.find(f => f.side === side && f.finger === finger);
      const flag: HandFlag = { side, finger, date: old?.date ?? today, spots };
      commit({ type: 'setFlag', flag, flagged: true }, () =>
        backend.setHandFlag(flag, true),
      );
    },
    [state.flags, today, commit, backend],
  );

  const clearFinger = useCallback(
    (side: Side, finger: Finger) => {
      const flag: HandFlag = { side, finger, date: today, spots: [] };
      commit({ type: 'setFlag', flag, flagged: false }, () =>
        backend.setHandFlag(flag, false),
      );
    },
    [today, commit, backend],
  );

  const toggleFlag = useCallback(
    (side: Side, finger: Finger) =>
      state.flags.some(f => f.side === side && f.finger === finger)
        ? clearFinger(side, finger)
        : setFingerSpots(side, finger, []),
    [state.flags, clearFinger, setFingerSpots],
  );

  const api = useMemo<GameApi>(
    () => ({
      status,
      syncError,
      dismissSyncError: () => setSyncError(null),
      retry: () => {
        setStatus('loading');
        reload();
      },
      refresh: () => {
        reload();
      },
      backendKind: backend.kind,
      state,
      today,
      focus,
      quest,
      pet,
      celebration,
      dismissCelebration: () => setCelebration(null),
      completeQuest,
      setFingerSpots,
      clearFinger,
      toggleFlag,
      skipQuest: id =>
        commit({ type: 'skipQuest', questId: id }, () => backend.skipQuest(id)),
      logClimb: input => {
        const log: ClimbLog = { ...input, id: newId(), date: today };
        commit({ type: 'logClimb', log }, () => backend.addClimb(log));
      },
      removeClimb: id =>
        commit({ type: 'removeClimb', id }, () => backend.removeClimb(id)),
      saveReach: input => {
        const reach: Reach = { ...input, date: today };
        commit({ type: 'saveReach', reach }, () => backend.saveReach(reach));
      },
      finishOnboarding: result =>
        commit({ type: 'finishOnboarding', result }, () =>
          backend.finishOnboarding(result),
        ),
      skipOnboarding: () =>
        commit({ type: 'skipOnboarding' }, () => backend.skipOnboarding()),
      saveBaseline: result =>
        commit({ type: 'saveBaseline', result }, () =>
          backend.saveBaseline(result),
        ),
      saveAssessment: async record => {
        await commit(
          { type: 'saveAssessment', record },
          () => backend.saveAssessment(record),
          true,
        );
      },
      // Not shown before it is done: a failed reset must leave the profile.
      resetProfile: () => {
        backend.resetProfile().then(
          fresh => {
            setSyncError(null);
            dispatch({ type: 'reset', state: fresh });
          },
          () => setSyncError('Could not reset your profile.'),
        );
      },
      resetDemo: () => {
        if (backend.resetDemo) {
          backend.resetDemo().then(
            fresh => dispatch({ type: 'reset', state: fresh }),
            () => setSyncError('Could not reset the demo data.'),
          );
        }
      },
    }),
    [
      status,
      syncError,
      reload,
      backend,
      state,
      today,
      focus,
      quest,
      pet,
      celebration,
      completeQuest,
      setFingerSpots,
      clearFinger,
      toggleFlag,
      commit,
    ],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}
