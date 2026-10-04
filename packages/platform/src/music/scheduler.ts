/**
 * Plays an arrangement on an audio clock with a look-ahead timer: every
 * `interval` ms it hands over the notes due in the next `lookAhead` seconds,
 * each with its exact start time. The audio clock does the precise timing,
 * so a late or throttled timer never makes notes drift.
 *
 * Pure logic: the clock, the timer and what "play" means are passed in, so
 * the tests drive it with a fake clock.
 */
import type { Arrangement, TimedNote } from './song';

/** A note with its start in seconds from the first pass of the loop. */
export type ScheduledNote = TimedNote & Readonly<{ at: number }>;

/**
 * Notes that start in [from, to), seconds from the start of the first pass.
 * The loop repeats forever, so consecutive windows join without a gap or a
 * repeated note, also across the loop seam.
 */
export function notesInWindow(
  arrangement: Arrangement,
  from: number,
  to: number,
): ScheduledNote[] {
  const out: ScheduledNote[] = [];
  const loop = arrangement.loopSeconds;
  if (!(to > from) || !(loop > 0)) {
    return out;
  }
  const first = Math.max(0, Math.floor(from / loop));
  const last = Math.floor(to / loop);
  for (let pass = first; pass <= last; pass++) {
    const offset = pass * loop;
    for (const note of arrangement.notes) {
      const at = offset + note.time;
      if (at >= from && at < to) {
        out.push({ ...note, at });
      }
    }
  }
  return out;
}

export type LoopScheduler = Readonly<{
  /** Starts the loop so its first note plays at `origin` on the clock. */
  start(origin: number): void;
  /** Stops handing out notes. Notes already handed out still play. */
  stop(): void;
  readonly running: boolean;
}>;

export type SchedulerOptions = Readonly<{
  arrangement: Arrangement;
  /** Audio clock, in seconds. */
  now: () => number;
  /** Calls `tick` every `ms` until the returned function is called. */
  every: (tick: () => void, ms: number) => () => void;
  /** Schedules one note at `when` on the clock. */
  play: (note: ScheduledNote, when: number) => void;
  /** How far ahead notes are scheduled, in seconds. */
  lookAhead?: number;
  /** How often the timer looks, in ms. */
  interval?: number;
}>;

export function createLoopScheduler({
  arrangement,
  now,
  every,
  play,
  lookAhead = 0.25,
  interval = 50,
}: SchedulerOptions): LoopScheduler {
  let cancel: (() => void) | null = null;
  let origin = 0;
  /** Song time up to which notes have been handed out. */
  let until = 0;

  const tick = () => {
    const songNow = now() - origin;
    // After a long stall (a frozen tab), skip what was missed instead of
    // playing it all at once.
    if (until < songNow - lookAhead) {
      until = songNow;
    }
    const end = songNow + lookAhead;
    if (end <= until) {
      return;
    }
    for (const note of notesInWindow(arrangement, until, end)) {
      play(note, origin + note.at);
    }
    until = end;
  };

  return {
    start(at) {
      cancel?.();
      origin = at;
      until = 0;
      tick();
      cancel = every(tick, interval);
    },
    stop() {
      cancel?.();
      cancel = null;
    },
    get running() {
      return cancel !== null;
    },
  };
}
