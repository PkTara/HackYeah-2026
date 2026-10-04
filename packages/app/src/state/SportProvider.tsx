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
  SPORTS,
  SPORT_IDS,
  emptySport,
  petStatus,
  pickSportFocus,
  pickSportQuest,
  sportFor,
  sportReducer,
  toLocalDate,
  type PetMode,
  type PetStatus,
  type SessionLog,
  type Side,
  type Sport,
  type SportAction,
  type SportFocus,
  type SportId,
  type SportQuestPick,
  type SportState,
} from '@hackyeah/core';
import type { SportBackend } from '@hackyeah/data';
import { SPORT_VIEWS, type SportView } from '../sports';
import type { Celebration } from './GameProvider';
import { useSfx } from '../sfx';

type SportApi = Readonly<{
  /** 'loading' until the saved sports and mode are read the first time. */
  status: 'loading' | 'ready';
  /** Which pet the app shows. Switching saves it for the next launch. */
  mode: PetMode;
  setMode: (mode: PetMode) => void;
  /** Set when a change could not be saved; the screen shows the saved state. */
  syncError: string | null;
  dismissSyncError: () => void;
  /** Every sport pet's level, for the Pets panel. */
  pets: Readonly<Record<SportId, PetStatus>>;

  /*
   * The active sport: the one the mode's pet leads. In monkey mode this is
   * running, but no sport screen is showing then.
   */
  sport: Sport;
  view: SportView;
  state: SportState;
  today: string;
  focus: SportFocus;
  quest: SportQuestPick;
  pet: PetStatus;
  celebration: Celebration | null;
  dismissCelebration: () => void;

  completeQuest: (id: string) => void;
  skipQuest: (id: string) => void;
  /** Saves a session dated today and returns its new id. */
  logSession: (log: Omit<SessionLog, 'id' | 'date'>) => string;
  removeSession: (id: string) => void;
  /** Flags a sore spot, or clears it. A flag keeps its first date. */
  setFlag: (side: Side, part: string, flagged: boolean) => void;
  /** Deletes the active sport's data. The other pets are untouched. */
  resetSport: () => void;
}>;

const SportContext = createContext<SportApi | null>(null);

export function useSport(): SportApi {
  const api = useContext(SportContext);
  if (!api) {
    throw new Error('useSport must be used inside <SportProvider>');
  }
  return api;
}

type Props = {
  children: ReactNode;
  backend: SportBackend;
  /** Fixed date for tests; defaults to the device's local date. */
  today?: string;
};

type AllSports = Readonly<Record<SportId, SportState>>;
type AllAction =
  | { type: 'loadAll'; states: AllSports }
  | { sport: SportId; action: SportAction };

/** Each sport's state, changed by the shared sport reducer. */
function allReducer(all: AllSports, a: AllAction): AllSports {
  if ('states' in a) {
    return a.states;
  }
  return { ...all, [a.sport]: sportReducer(all[a.sport], a.action) };
}

const EMPTY: AllSports = { run: emptySport, swim: emptySport };

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The sport modes' useGame(): holds what the sport screens show and keeps it
 * in step with the SportBackend. Same rule as GameProvider: apply on screen
 * first, then save; if saving fails, reload the saved state and say so.
 */
export function SportProvider({ children, backend, today: fixedToday }: Props) {
  const [all, dispatch] = useReducer(allReducer, EMPTY);
  const [status, setStatus] = useState<SportApi['status']>('loading');
  const [mode, setModeState] = useState<PetMode>('monkey');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  // Logging a session or finishing a quest gets the same short sounds as the
  // monkey (quiet, and only when sound effects are on; see sfx.tsx).
  const { play } = useSfx();
  const today = fixedToday ?? toLocalDate(new Date());

  const reload = useCallback(async () => {
    try {
      const states = await Promise.all(SPORT_IDS.map(id => backend.load(id)));
      dispatch({
        type: 'loadAll',
        states: Object.fromEntries(
          SPORT_IDS.map((id, i) => [id, states[i]]),
        ) as AllSports,
      });
    } catch {
      // Unreadable data: the pets start from nothing rather than blocking.
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

  const sport = sportFor(mode) ?? SPORTS.run;
  const view = SPORT_VIEWS[sport.id];
  const state = all[sport.id];

  const commit = useCallback(
    (action: SportAction, save: () => Promise<void>) => {
      dispatch({ sport: sport.id, action });
      save().then(
        () => setSyncError(null),
        () => {
          setSyncError(
            'Could not save that change. Showing your last saved data.',
          );
          reload();
        },
      );
    },
    [sport.id, reload],
  );

  const focus = useMemo(
    () => pickSportFocus(state.logs, sport.kinds),
    [state.logs, sport.kinds],
  );
  const quest = useMemo(
    () =>
      pickSportQuest(sport.quests, focus, {
        hasFlag: state.flags.length > 0,
        completed: state.completed,
        skipped: state.skipped,
      }),
    [sport.quests, focus, state.flags, state.completed, state.skipped],
  );
  const pets = useMemo(
    () =>
      Object.fromEntries(
        SPORT_IDS.map(id => [
          id,
          petStatus(all[id].completed, SPORTS[id].unlocks),
        ]),
      ) as Record<SportId, PetStatus>,
    [all],
  );
  const pet = pets[sport.id];

  const completeQuest = useCallback(
    (id: string) => {
      if (state.completed.includes(id)) {
        return;
      }
      const before = petStatus(state.completed, sport.unlocks);
      const after = petStatus([...state.completed, id], sport.unlocks);
      const levelUp = after.level > before.level ? after.level : null;
      play(levelUp ? 'levelUp' : 'success');
      setCelebration(c => ({
        id: (c?.id ?? 0) + 1,
        xp: after.xp - before.xp,
        level: levelUp,
        unlocked: levelUp
          ? sport.unlocks.find(u => u.level === levelUp)?.name ?? null
          : null,
      }));
      commit({ type: 'completeQuest', questId: id }, () =>
        backend.completeQuest(sport.id, id),
      );
    },
    [state.completed, sport, commit, backend, play],
  );

  const api = useMemo<SportApi>(
    () => ({
      status,
      mode,
      setMode: next => {
        setModeState(next);
        setCelebration(null);
        backend.saveMode(next).catch(() => {});
      },
      syncError,
      dismissSyncError: () => setSyncError(null),
      pets,
      sport,
      view,
      state,
      today,
      focus,
      quest,
      pet,
      celebration,
      dismissCelebration: () => setCelebration(null),
      completeQuest,
      skipQuest: id =>
        commit({ type: 'skipQuest', questId: id }, () =>
          backend.skipQuest(sport.id, id),
        ),
      logSession: input => {
        const log: SessionLog = { ...input, id: newId(), date: today };
        play('success');
        commit({ type: 'logSession', log }, () =>
          backend.addSession(sport.id, log),
        );
        return log.id;
      },
      removeSession: id =>
        commit({ type: 'removeSession', id }, () =>
          backend.removeSession(sport.id, id),
        ),
      setFlag: (side, part, flagged) => {
        const flag = { side, part, date: today };
        commit({ type: 'setFlag', flag, flagged }, () =>
          backend.setFlag(sport.id, flag, flagged),
        );
      },
      resetSport: () => {
        const id = sport.id;
        backend.reset(id).then(
          fresh => {
            setSyncError(null);
            dispatch({ sport: id, action: { type: 'reset', state: fresh } });
          },
          () => setSyncError('Could not reset that pet.'),
        );
      },
    }),
    [
      status,
      mode,
      syncError,
      pets,
      backend,
      sport,
      view,
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

  return <SportContext.Provider value={api}>{children}</SportContext.Provider>;
}
