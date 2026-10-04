/**
 * Gazelle mode's data: runs, leg flags and gazelle quest progress, kept on
 * the device in the platform key-value store. The FastAPI server does not
 * know about running yet, so this is the only RunBackend for now.
 *
 * Screens never call it directly: they go through useRun() in packages/app,
 * the same way the climbing screens go through useGame().
 */
import {
  emptyRun,
  parseRunState,
  runReducer,
  sampleRunGame,
  type LegFlag,
  type PetMode,
  type RunAction,
  type RunLog,
  type RunState,
} from '@hackyeah/core';
import type { KeyValueStore } from '@hackyeah/platform';

export const RUN_STORAGE_KEY = 'climbing-monkey/runs/v1';
export const MODE_STORAGE_KEY = 'climbing-monkey/mode/v1';

export interface RunBackend {
  readonly kind: 'local';
  load(): Promise<RunState>;
  addRun(run: RunLog): Promise<void>;
  removeRun(id: string): Promise<void>;
  /** Completing twice must not count twice (XP comes from unique ids). */
  completeQuest(questId: string): Promise<void>;
  skipQuest(questId: string): Promise<void>;
  /** Sets a leg flag on or off. Not a toggle, so retries are harmless. */
  setLegFlag(flag: LegFlag, flagged: boolean): Promise<void>;
  /** Deletes every run, flag and gazelle quest. No example data comes back. */
  reset(): Promise<RunState>;
  /** Which pet the app shows; saved so the app reopens in the same mode. */
  loadMode(): Promise<PetMode>;
  saveMode(mode: PetMode): Promise<void>;
}

export function createLocalRunBackend(
  storage: KeyValueStore,
  /** What a fresh install starts with. */
  seed: RunState = sampleRunGame,
): RunBackend {
  let current: RunState | null = null;

  async function state(): Promise<RunState> {
    if (!current) {
      current = parseRunState(await storage.getItem(RUN_STORAGE_KEY)) ?? seed;
    }
    return current;
  }

  // Same pattern as the climbing backend: every command runs through the
  // reducer the app uses, queued so two quick taps cannot race.
  let queue: Promise<unknown> = Promise.resolve();
  function update(next: (old: RunState) => RunState): Promise<void> {
    const run = queue.then(async () => {
      current = next(await state());
      await storage.setItem(RUN_STORAGE_KEY, JSON.stringify(current));
    });
    queue = run.catch(() => {});
    return run;
  }
  const apply = (action: RunAction) => update(old => runReducer(old, action));

  return {
    kind: 'local',
    load: state,
    addRun: run => apply({ type: 'logRun', run }),
    removeRun: id => apply({ type: 'removeRun', id }),
    completeQuest: questId => apply({ type: 'completeQuest', questId }),
    skipQuest: questId => apply({ type: 'skipQuest', questId }),
    setLegFlag: (flag, flagged) => apply({ type: 'setLegFlag', flag, flagged }),
    async reset() {
      // Saved as empty, not removed: a missing save would load the seed.
      await update(() => emptyRun);
      return emptyRun;
    },
    async loadMode() {
      return (await storage.getItem(MODE_STORAGE_KEY)) === 'gazelle'
        ? 'gazelle'
        : 'monkey';
    },
    saveMode: mode => storage.setItem(MODE_STORAGE_KEY, mode),
  };
}
