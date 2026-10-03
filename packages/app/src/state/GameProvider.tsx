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
  gameReducer,
  parseGameState,
  petStatus,
  pickFocus,
  pickQuest,
  sampleGame,
  toLocalDate,
  type ClimbLog,
  type Finger,
  type Focus,
  type GameState,
  type PetStatus,
  type QuestPick,
  type Reach,
  type Side,
} from '@hackyeah/core';
import { useCapabilities } from '../capabilities';

const STORAGE_KEY = 'climbing-monkey/game/v1';

export type Celebration = Readonly<{
  id: number;
  xp: number;
  /** Set when the quest pushed the monkey to a new level. */
  level: number | null;
  /** Name of the cosmetic unlocked at that level, if any. */
  unlocked: string | null;
}>;

type GameApi = Readonly<{
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
  /** Fixed date for tests; defaults to the device's local date. */
  today?: string;
};

/**
 * Holds the game state, saves it through the platform storage capability,
 * and derives everything the screens show from it.
 */
export function GameProvider({ children, today: fixedToday }: Props) {
  const { storage } = useCapabilities();
  const [state, dispatch] = useReducer(gameReducer, sampleGame);
  const [loaded, setLoaded] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const today = fixedToday ?? toLocalDate(new Date());
  const nextId = useRef(1);

  useEffect(() => {
    let live = true;
    storage
      .getItem(STORAGE_KEY)
      .then(json => {
        const saved = parseGameState(json);
        if (live && saved) {
          dispatch({ type: 'load', state: saved });
        }
      })
      .catch(() => {})
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [storage]);

  useEffect(() => {
    if (loaded) {
      storage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [loaded, state, storage]);

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
        id: nextId.current++,
        xp: after.xp - before.xp,
        level: levelUp,
        unlocked: levelUp
          ? COSMETICS.find(c => c.level === levelUp)?.name ?? null
          : null,
      });
      dispatch({ type: 'completeQuest', questId: id });
    },
    [state.completed],
  );

  const api = useMemo<GameApi>(
    () => ({
      state,
      today,
      focus,
      quest,
      pet,
      celebration,
      dismissCelebration: () => setCelebration(null),
      completeQuest,
      skipQuest: id => dispatch({ type: 'skipQuest', questId: id }),
      logClimb: log =>
        dispatch({
          type: 'logClimb',
          log: { ...log, id: `log-${Date.now()}-${nextId.current++}`, date: today },
        }),
      removeClimb: id => dispatch({ type: 'removeClimb', id }),
      toggleFlag: (side, finger) =>
        dispatch({ type: 'toggleFlag', side, finger, date: today }),
      saveReach: reach =>
        dispatch({ type: 'saveReach', reach: { ...reach, date: today } }),
      resetDemo: () => dispatch({ type: 'reset', state: sampleGame }),
    }),
    [state, today, focus, quest, pet, celebration, completeQuest],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}
