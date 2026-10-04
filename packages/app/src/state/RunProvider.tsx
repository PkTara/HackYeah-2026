import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import {
  GAZELLE_COSMETICS,
  emptyRun,
  petStatus,
  pickRunFocus,
  pickRunQuest,
  runReducer,
  toLocalDate,
  type LegPart,
  type PetMode,
  type PetStatus,
  type RunAction,
  type RunFocus,
  type RunLog,
  type RunQuestPick,
  type RunState,
  type Side,
} from '@hackyeah/core';
import type { RunBackend } from '@hackyeah/data';
import type { Celebration } from './GameProvider';
import { useSfx } from '../sfx';

type RunApi = Readonly<{
  /** 'loading' until the saved runs and mode are read the first time. */
  status: 'loading' | 'ready';
  /** Which pet the app shows. Switching saves it for the next launch. */
  mode: PetMode;
  setMode: (mode: PetMode) => void;
  /** Set when a change could not be saved; the screen shows the saved state. */
  syncError: string | null;
  dismissSyncError: () => void;

  state: RunState;
  today: string;
  focus: RunFocus;
  quest: RunQuestPick;
  pet: PetStatus;
  celebration: Celebration | null;
  dismissCelebration: () => void;

  completeQuest: (id: string) => void;
  skipQuest: (id: string) => void;
  logRun: (run: Omit<RunLog, 'id' | 'date'>) => void;
  removeRun: (id: string) => void;
  /** Flags a sore leg spot, or clears it. A flag keeps its first date. */
  setLegFlag: (side: Side, part: LegPart, flagged: boolean) => void;
  /** Deletes every run, flag and gazelle quest. The monkey is untouched. */
  resetRuns: () => void;
}>;

const RunContext = createContext<RunApi | null>(null);

export function useRun(): RunApi {
  const api = useContext(RunContext);
  if (!api) {
    throw new Error('useRun must be used inside <RunProvider>');
  }
  return api;
}

type Props = {
  children: ReactNode;
  backend: RunBackend;
  /** Fixed date for tests; defaults to the device's local date. */
  today?: string;
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Gazelle mode's useGame(): holds the runs the screens show and keeps them in
 * step with the RunBackend. Same rule as GameProvider: apply on screen first,
 * then save; if saving fails, reload the saved state and say so.
 */
export function RunProvider({ children, backend, today: fixedToday }: Props) {
  const [state, dispatch] = useReducer(runReducer, emptyRun);
  const [status, setStatus] = useState<RunApi['status']>('loading');
  const [mode, setModeState] = useState<PetMode>('monkey');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  // Logging a run or finishing a quest gets the same short sounds as the
  // monkey (quiet, and only when sound effects are on; see sfx.tsx).
  const { play } = useSfx();
  const today = fixedToday ?? toLocalDate(new Date());

  const reload = useCallback(async () => {
    try {
      dispatch({ type: 'load', state: await backend.load() });
    } catch {
      // Unreadable runs: the gazelle starts from nothing rather than blocking.
    }
  }, [backend]);

  useEffect(() => {
    let live = true;
    Promise.all([
      reload(),
      backend.loadMode().then(
        m => live && setModeState(m),
        () => {},
      ),
    ]).then(() => live && setStatus('ready'));
    return () => {
      live = false;
    };
  }, [backend, reload]);

  const commit = useCallback(
    (action: RunAction, save: () => Promise<void>) => {
      dispatch(action);
      save().then(
        () => setSyncError(null),
        () => {
          setSyncError(
            'Could not save that change. Showing your last saved runs.',
          );
          reload();
        },
      );
    },
    [reload],
  );

  const focus = useMemo(() => pickRunFocus(state.runs), [state.runs]);
  const quest = useMemo(
    () =>
      pickRunQuest(focus, {
        hasFlag: state.legFlags.length > 0,
        completed: state.completed,
        skipped: state.skipped,
      }),
    [focus, state.legFlags, state.completed, state.skipped],
  );
  const pet = useMemo(
    () => petStatus(state.completed, GAZELLE_COSMETICS),
    [state.completed],
  );

  const completeQuest = useCallback(
    (id: string) => {
      if (state.completed.includes(id)) {
        return;
      }
      const before = petStatus(state.completed, GAZELLE_COSMETICS);
      const after = petStatus([...state.completed, id], GAZELLE_COSMETICS);
      const levelUp = after.level > before.level ? after.level : null;
      play(levelUp ? 'levelUp' : 'success');
      setCelebration(c => ({
        id: (c?.id ?? 0) + 1,
        xp: after.xp - before.xp,
        level: levelUp,
        unlocked: levelUp
          ? GAZELLE_COSMETICS.find(u => u.level === levelUp)?.name ?? null
          : null,
      }));
      commit({ type: 'completeQuest', questId: id }, () =>
        backend.completeQuest(id),
      );
    },
    [state.completed, commit, backend, play],
  );

  const api = useMemo<RunApi>(
    () => ({
      status,
      mode,
      setMode: next => {
        setModeState(next);
        backend.saveMode(next).catch(() => {});
      },
      syncError,
      dismissSyncError: () => setSyncError(null),
      state,
      today,
      focus,
      quest,
      pet,
      celebration,
      dismissCelebration: () => setCelebration(null),
      completeQuest,
      skipQuest: id =>
        commit({ type: 'skipQuest', questId: id }, () => backend.skipQuest(id)),
      logRun: input => {
        const run: RunLog = { ...input, id: newId(), date: today };
        play('success');
        commit({ type: 'logRun', run }, () => backend.addRun(run));
      },
      removeRun: id =>
        commit({ type: 'removeRun', id }, () => backend.removeRun(id)),
      setLegFlag: (side, part, flagged) => {
        const flag = { side, part, date: today };
        commit({ type: 'setLegFlag', flag, flagged }, () =>
          backend.setLegFlag(flag, flagged),
        );
      },
      resetRuns: () => {
        backend.reset().then(
          fresh => {
            setSyncError(null);
            dispatch({ type: 'reset', state: fresh });
          },
          () => setSyncError('Could not reset your runs.'),
        );
      },
    }),
    [
      status,
      mode,
      syncError,
      backend,
      state,
      today,
      focus,
      quest,
      pet,
      celebration,
      completeQuest,
      commit,
      play,
    ],
  );

  return <RunContext.Provider value={api}>{children}</RunContext.Provider>;
}
