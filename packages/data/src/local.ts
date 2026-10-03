/**
 * Backend that keeps everything on the device, in the platform key-value
 * store. Used for the demo and whenever no server is configured.
 */
import {
  gameReducer,
  parseGameState,
  sampleGame,
  type GameAction,
  type GameState,
} from '@hackyeah/core';
import type { KeyValueStore } from '@hackyeah/platform';
import type { ClimbingBackend } from './backend';

export const LOCAL_STORAGE_KEY = 'climbing-monkey/game/v1';

export function createLocalBackend(
  storage: KeyValueStore,
  /** What a fresh install starts with. */
  seed: GameState = sampleGame,
): ClimbingBackend {
  let current: GameState | null = null;

  async function state(): Promise<GameState> {
    if (!current) {
      current = parseGameState(await storage.getItem(LOCAL_STORAGE_KEY)) ?? seed;
    }
    return current;
  }

  // Every command runs through the same reducer the app uses, then saves.
  // Commands queue up so two quick taps cannot both start from the old state.
  let queue: Promise<unknown> = Promise.resolve();
  function apply(action: GameAction): Promise<void> {
    const run = queue.then(async () => {
      current = gameReducer(await state(), action);
      await storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    kind: 'local',
    load: state,
    addClimb: log => apply({ type: 'logClimb', log }),
    removeClimb: id => apply({ type: 'removeClimb', id }),
    completeQuest: questId => apply({ type: 'completeQuest', questId }),
    skipQuest: questId => apply({ type: 'skipQuest', questId }),
    setHandFlag: (flag, flagged) => apply({ type: 'setFlag', flag, flagged }),
    saveReach: reach => apply({ type: 'saveReach', reach }),
    async resetDemo() {
      await apply({ type: 'reset', state: seed });
      return seed;
    },
  };
}
