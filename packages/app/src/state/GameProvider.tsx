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
  type ClimbLog,
  type Finger,
  type Focus,
  type GameAction,
  type GameState,
  type HandFlag,
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
  toggleFlag: (side: Side, finger: Finger) => void;
  saveReach: (reach: Omit<Reach, 'date'>) => void;
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

  /** Show the change now, then save it. */
  const commit = useCallback(
    (action: GameAction, save: () => Promise<void>) => {
      dispatch(action);
      save().then(
        () => setSyncError(null),
        () => {
          setSyncError('Could not save that change. Showing your last saved data.');
          reload();
        },
      );
    },
    [reload],
  );

  const focus = useMemo(() => pickFocus(state.logs), [state.logs]);
  const quest = useMemo(
    () =>
      pickQuest(focus, {
        hasFlag: state.flags.length > 0,
        completed: state.completed,
        skipped: state.skipped,
      }),
    [focus, state.flags, state.completed, state.skipped],
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

  const toggleFlag = useCallback(
    (side: Side, finger: Finger) => {
      const flag: HandFlag = { side, finger, date: today };
      const flagged = !state.flags.some(
        f => f.side === side && f.finger === finger,
      );
      commit({ type: 'setFlag', flag, flagged }, () =>
        backend.setHandFlag(flag, flagged),
      );
    },
    [state.flags, today, commit, backend],
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
      backendKind: backend.kind,
      state,
      today,
      focus,
      quest,
      pet,
      celebration,
      dismissCelebration: () => setCelebration(null),
      completeQuest,
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
      toggleFlag,
      commit,
    ],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}
