/**
 * The contract between the app and wherever its data lives.
 *
 * Screens never call this directly: they go through useGame() in
 * packages/app, which updates the screen first and then calls the backend.
 * Swapping the local demo store for a real server means passing a
 * different ClimbingBackend; no screen changes.
 */
import type {
  BaselineResult,
  ClimbLog,
  GameState,
  HandFlag,
  OnboardingResult,
  Reach,
} from '@hackyeah/core';

export interface ClimbingBackend {
  /** 'local' keeps data on the device; 'remote' talks to a server. */
  readonly kind: 'local' | 'remote';

  /** Everything the app shows: climbs, flags, quest progress, reach. */
  load(): Promise<GameState>;

  /*
   * Writes. A backend that picks quests itself may answer any write with the
   * new state. The app shows it once no other change is still saving. The
   * on-device backend answers nothing.
   */

  /** The id and date are made on the device, so a retried call is safe. */
  addClimb(log: ClimbLog): Promise<GameState | void>;
  removeClimb(id: string): Promise<GameState | void>;

  /** Completing twice must not count twice (XP comes from unique ids). */
  completeQuest(questId: string): Promise<GameState | void>;
  skipQuest(questId: string): Promise<GameState | void>;

  /** Sets a finger flag on or off. Not a toggle, so retries are harmless. */
  setHandFlag(flag: HandFlag, flagged: boolean): Promise<GameState | void>;

  saveReach(reach: Reach): Promise<GameState | void>;

  /** First-run setup. Finishing also saves the reach, if one was given. */
  finishOnboarding(result: OnboardingResult): Promise<GameState | void>;
  skipOnboarding(): Promise<GameState | void>;

  /** One home test done again from the Tests tab. Replaces that test's result. */
  saveBaseline(result: BaselineResult): Promise<GameState | void>;

  /** Demo only: restore the sample data. Servers can leave this out. */
  resetDemo?(): Promise<GameState>;
}

/** Thrown by the HTTP backend for non-2xx answers and network failures. */
export class BackendError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the request never got an answer. */
    readonly status: number,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}
