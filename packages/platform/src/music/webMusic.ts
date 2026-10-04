/**
 * The music capability for browsers: the song (song.ts) played by the look-
 * ahead scheduler (scheduler.ts) through the Web Audio band (voices.ts).
 *
 * The AudioContext is made on the first play(), which always comes from a
 * tap or key press, so the browser never blocks it. While the page is hidden
 * the context is suspended; it carries on where it was when the page is
 * visible again.
 */
import type { MusicCapability } from '../types';
import type { AudioContextLike } from './audio.types';
import { createLoopScheduler, type LoopScheduler } from './scheduler';
import { arrange, type Arrangement } from './song';
import { MASTER_GAIN, createMusicGraph, type MusicGraph } from './voices';

/** Seconds. */
export const FADE_IN = 1.5;
export const FADE_OUT = 0.4;
/** Head start before the first note, so it is never scheduled in the past. */
const START_DELAY = 0.1;

export type MusicEnvironment = Readonly<{
  createContext(): AudioContextLike;
  /** Repeating timer; returns a cancel function. */
  every(tick: () => void, ms: number): () => void;
  /** One-off timer; returns a cancel function. */
  after(run: () => void, ms: number): () => void;
  onVisibilityChange(listener: (hidden: boolean) => void): () => void;
  onNextGesture(listener: () => void): () => void;
}>;

type Engine = Readonly<{
  ctx: AudioContextLike;
  graph: MusicGraph;
  scheduler: LoopScheduler;
}>;

export function createWebMusic(
  env: MusicEnvironment,
  {
    arrangement = arrange(),
    volume = MASTER_GAIN,
  }: { arrangement?: Arrangement; volume?: number } = {},
): MusicCapability {
  let engine: Engine | null = null;
  let playing = false;
  let cancelSuspend: (() => void) | null = null;

  const suspend = (ctx: AudioContextLike) => {
    ctx.suspend?.().catch(() => {});
  };
  const resume = (ctx: AudioContextLike): Promise<void> =>
    ctx.state === 'running' || !ctx.resume
      ? Promise.resolve()
      : ctx.resume().catch(() => {});

  const setUp = (): Engine => {
    if (engine) {
      return engine;
    }
    const ctx = env.createContext();
    const graph = createMusicGraph(ctx, volume);
    const scheduler = createLoopScheduler({
      arrangement,
      now: () => ctx.currentTime,
      every: env.every,
      play: (note, when) => graph.playNote(note, when),
    });
    env.onVisibilityChange(hidden => {
      if (!playing) {
        return;
      }
      if (hidden) {
        suspend(ctx);
      } else {
        resume(ctx);
      }
    });
    engine = { ctx, graph, scheduler };
    return engine;
  };

  /** Moves the fade gain from where it is now to `target` over `seconds`. */
  const fadeTo = (current: Engine, target: number, seconds: number) => {
    const gain = current.graph.fade.gain;
    const now = current.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(target, now + seconds);
  };

  return {
    get playing() {
      return playing;
    },
    async play() {
      if (playing) {
        return;
      }
      playing = true;
      cancelSuspend?.();
      cancelSuspend = null;
      const current = setUp();
      // Asked for inside the gesture, before anything is awaited.
      const resumed = resume(current.ctx);
      current.scheduler.start(current.ctx.currentTime + START_DELAY);
      fadeTo(current, 1, FADE_IN);
      await resumed;
    },
    stop() {
      if (!playing || !engine) {
        playing = false;
        return;
      }
      const current = engine;
      playing = false;
      current.scheduler.stop();
      fadeTo(current, 0, FADE_OUT);
      // Once the fade is over, let the audio hardware rest.
      cancelSuspend = env.after(() => {
        cancelSuspend = null;
        if (!playing) {
          suspend(current.ctx);
        }
      }, (FADE_OUT + 0.1) * 1000);
    },
    onNextGesture(listener) {
      return env.onNextGesture(listener);
    },
  };
}

// Typed locally so shared code doesn't need the DOM lib.
type EventTargetLike = {
  addEventListener(type: string, listener: () => void, options?: object): void;
  removeEventListener(type: string, listener: () => void, options?: object): void;
};
type BrowserGlobals = EventTargetLike & {
  AudioContext?: new (options?: object) => AudioContextLike;
  webkitAudioContext?: new (options?: object) => AudioContextLike;
  document?: EventTargetLike & { visibilityState?: string };
  setInterval(run: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
};

/**
 * Events that count as a user gesture for audio in current browsers: a key
 * press, a mouse button, or the end of a touch.
 */
export const GESTURES = ['pointerup', 'keydown', 'touchend'];

/**
 * One AudioContext for the whole page, shared by the music and the sound
 * effects, made the first time the returned function is called (always
 * after a tap). Null where the browser has no Web Audio.
 *
 * It uses the default "interactive" latency, so a tap sound follows the tap.
 * The music schedules ahead on the audio clock, so it does not mind.
 */
export function sharedBrowserAudioContext(): (() => AudioContextLike) | null {
  const browser = globalThis as unknown as BrowserGlobals;
  const AudioContextClass = browser.AudioContext ?? browser.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  let ctx: AudioContextLike | null = null;
  return () => {
    ctx = ctx ?? new AudioContextClass();
    return ctx;
  };
}

/**
 * The real browser, or null where Web Audio is missing. Pass the page's
 * shared context; without one the music gets a context of its own.
 */
export function browserMusicEnvironment(
  createContext = sharedBrowserAudioContext(),
): MusicEnvironment | null {
  const browser = globalThis as unknown as BrowserGlobals;
  if (!createContext || typeof browser.addEventListener !== 'function') {
    return null;
  }
  return {
    createContext,
    every(tick, ms) {
      const id = browser.setInterval(tick, ms);
      return () => browser.clearInterval(id);
    },
    after(run, ms) {
      const id = browser.setTimeout(run, ms);
      return () => browser.clearTimeout(id);
    },
    onVisibilityChange(listener) {
      const doc = browser.document;
      if (!doc) {
        return () => {};
      }
      const onChange = () => listener(doc.visibilityState === 'hidden');
      doc.addEventListener('visibilitychange', onChange);
      return () => doc.removeEventListener('visibilitychange', onChange);
    },
    onNextGesture(listener) {
      const options = { capture: true };
      const onGesture = () => {
        cancel();
        listener();
      };
      const cancel = () => {
        for (const type of GESTURES) {
          browser.removeEventListener(type, onGesture, options);
        }
      };
      for (const type of GESTURES) {
        browser.addEventListener(type, onGesture, options);
      }
      return cancel;
    },
  };
}
