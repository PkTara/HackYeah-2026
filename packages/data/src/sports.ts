/**
 * The sport modes' data: sessions, body flags and quest progress for each
 * sport (running, swimming), kept on the device in the platform key-value
 * store, one key per sport. The FastAPI server does not know about these
 * sports yet, so this is the only SportBackend for now.
 *
 * Screens never call it directly: they go through useSport() in
 * packages/app, the same way the climbing screens go through useGame().
 */
import {
  SPORTS,
  emptySport,
  parseSportState,
  sportReducer,
  type BodyFlag,
  type PetMode,
  type SessionLog,
  type SportAction,
  type SportId,
  type SportState,
} from '@hackyeah/core';
import type { KeyValueStore } from '@hackyeah/platform';

export const MODE_STORAGE_KEY = 'climbing-monkey/mode/v1';
export const sportStorageKey = (sport: SportId) =>
  `climbing-monkey/sport/${sport}/v1`;

const MODES: readonly PetMode[] = ['monkey', 'gazelle', 'dolphin'];

export interface SportBackend {
  readonly kind: 'local';
  load(sport: SportId): Promise<SportState>;
  addSession(sport: SportId, log: SessionLog): Promise<void>;
  removeSession(sport: SportId, id: string): Promise<void>;
  /** Completing twice must not count twice (XP comes from unique ids). */
  completeQuest(sport: SportId, questId: string): Promise<void>;
  skipQuest(sport: SportId, questId: string): Promise<void>;
  /** Sets a body flag on or off. Not a toggle, so retries are harmless. */
  setFlag(sport: SportId, flag: BodyFlag, flagged: boolean): Promise<void>;
  /** Deletes one sport's sessions, flags and quests. No example data returns. */
  reset(sport: SportId): Promise<SportState>;
  /** Which pet the app shows; saved so the app reopens in the same mode. */
  loadMode(): Promise<PetMode>;
  saveMode(mode: PetMode): Promise<void>;
}

export function createLocalSportBackend(
  storage: KeyValueStore,
  /** What a fresh install starts with per sport. Defaults to the samples. */
  seed: (sport: SportId) => SportState = sport => SPORTS[sport].sample,
): SportBackend {
  const current = new Map<SportId, SportState>();

  async function state(sport: SportId): Promise<SportState> {
    let s = current.get(sport);
    if (!s) {
      s =
        parseSportState(await storage.getItem(sportStorageKey(sport))) ??
        seed(sport);
      current.set(sport, s);
    }
    return s;
  }

  // Same pattern as the climbing backend: every command runs through the
  // reducer the app uses, queued so two quick taps cannot race.
  let queue: Promise<unknown> = Promise.resolve();
  function update(
    sport: SportId,
    next: (old: SportState) => SportState,
  ): Promise<void> {
    const run = queue.then(async () => {
      const s = next(await state(sport));
      current.set(sport, s);
      await storage.setItem(sportStorageKey(sport), JSON.stringify(s));
    });
    queue = run.catch(() => {});
    return run;
  }
  const apply = (sport: SportId, action: SportAction) =>
    update(sport, old => sportReducer(old, action));

  return {
    kind: 'local',
    load: state,
    addSession: (sport, log) => apply(sport, { type: 'logSession', log }),
    removeSession: (sport, id) => apply(sport, { type: 'removeSession', id }),
    completeQuest: (sport, questId) =>
      apply(sport, { type: 'completeQuest', questId }),
    skipQuest: (sport, questId) => apply(sport, { type: 'skipQuest', questId }),
    setFlag: (sport, flag, flagged) =>
      apply(sport, { type: 'setFlag', flag, flagged }),
    async reset(sport) {
      // Saved as empty, not removed: a missing save would load the sample.
      await update(sport, () => emptySport);
      return emptySport;
    },
    async loadMode() {
      const saved = await storage.getItem(MODE_STORAGE_KEY);
      return MODES.find(m => m === saved) ?? 'monkey';
    },
    saveMode: mode => storage.setItem(MODE_STORAGE_KEY, mode),
  };
}
