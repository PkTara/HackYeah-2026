/**
 * The sound effect capability for browsers: the effects in effects.ts,
 * rendered once each into an AudioBuffer and played through one quiet gain
 * straight to the speakers.
 *
 * There is no compressor on purpose. The effects are fixed buffers whose
 * peaks are known (see the effects tests), so nothing needs taming, and a
 * DynamicsCompressorNode adds automatic make-up gain (about +11 dB at
 * limiter settings), which made the effects louder, not safer. The music
 * keeps its own compressor.
 *
 * It shares the page's AudioContext with the music. The context is only
 * made or resumed after the person has tapped, clicked or pressed a key on
 * the page; effects asked for before that (the welcome bubble typing on the
 * first load) are dropped. Effects are also dropped while the page is
 * hidden. When the effects have been quiet for a moment and the music is
 * off, the context is suspended again so the audio hardware can rest.
 */
import type { SfxCapability, SfxName } from '../types';
import type {
  AudioBufferLike,
  AudioContextLike,
  GainNodeLike,
} from '../music/audio.types';
import { GESTURES } from '../music/webMusic';
import { SFX_GAIN, effectSeconds, renderEffect, typingStep } from './effects';

/** How long after the last effect the context may be suspended, in ms. */
export const IDLE_SUSPEND_MS = 2000;

export type SfxEnvironment = Readonly<{
  /** The page's AudioContext. Made on the first call. */
  context(): AudioContextLike;
  /** True once the person has tapped, clicked or pressed a key on the page. */
  hasGesture(): boolean;
  isHidden(): boolean;
  /** True while something else (the music) needs the context running. */
  keepAwake(): boolean;
  /** One-off timer; returns a cancel function. */
  after(run: () => void, ms: number): () => void;
}>;

type Output = Readonly<{ ctx: AudioContextLike; input: GainNodeLike }>;

export function createWebSfx(
  env: SfxEnvironment,
  { volume = SFX_GAIN }: { volume?: number } = {},
): SfxCapability {
  let enabled = true;
  let output: Output | null = null;
  let cancelIdle: (() => void) | null = null;
  const buffers = new Map<string, AudioBufferLike>();

  const setUp = (): Output => {
    if (output) {
      return output;
    }
    const ctx = env.context();
    const input = ctx.createGain();
    input.gain.value = volume;
    input.connect(ctx.destination);
    output = { ctx, input };
    return output;
  };

  const bufferFor = (ctx: AudioContextLike, name: SfxName, variant: number) => {
    const step = name === 'typing' ? typingStep(variant) : 0;
    const key = `${name}:${step}`;
    let buffer = buffers.get(key);
    if (!buffer) {
      const samples = renderEffect(name, ctx.sampleRate, step);
      buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.getChannelData(0).set(samples);
      buffers.set(key, buffer);
    }
    return buffer;
  };

  /** Suspends the context once nothing has played for a while. */
  const restLater = (ctx: AudioContextLike, seconds: number) => {
    cancelIdle?.();
    cancelIdle = env.after(() => {
      cancelIdle = null;
      if (!env.keepAwake() && ctx.state === 'running') {
        ctx.suspend?.().catch(() => {});
      }
    }, seconds * 1000 + IDLE_SUSPEND_MS);
  };

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
    },
    play(name, variant = 0) {
      if (!enabled || !env.hasGesture() || env.isHidden()) {
        return;
      }
      try {
        const { ctx, input } = setUp();
        const source = ctx.createBufferSource();
        source.buffer = bufferFor(ctx, name, variant);
        source.connect(input);
        source.onended = () => source.disconnect();
        source.start(ctx.currentTime);
        // Wake the context (the music may have put it to sleep) only once
        // the sound is scheduled, so it starts the moment the audio runs.
        if (ctx.state !== 'running') {
          ctx.resume?.().catch(() => {});
        }
        restLater(ctx, effectSeconds(name));
      } catch {
        // A sound effect is never worth breaking a tap over.
      }
    },
  };
}

// Typed locally so shared code doesn't need the DOM lib.
type EventTargetLike = {
  addEventListener(type: string, listener: () => void, options?: object): void;
  removeEventListener(type: string, listener: () => void, options?: object): void;
};
type BrowserGlobals = EventTargetLike & {
  document?: { visibilityState?: string };
  navigator?: { userActivation?: { hasBeenActive?: boolean } };
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
};

/**
 * The real browser. `context` is the page's shared AudioContext and
 * `keepAwake` says whether the music is playing.
 */
export function browserSfxEnvironment(
  context: () => AudioContextLike,
  keepAwake: () => boolean,
): SfxEnvironment | null {
  const browser = globalThis as unknown as BrowserGlobals;
  if (typeof browser.addEventListener !== 'function') {
    return null;
  }
  // Watching for the first gesture adds listeners only; no audio is made.
  let gestured = false;
  const options = { capture: true };
  const onGesture = () => {
    gestured = true;
    for (const type of GESTURES) {
      browser.removeEventListener(type, onGesture, options);
    }
  };
  for (const type of GESTURES) {
    browser.addEventListener(type, onGesture, options);
  }
  return {
    context,
    hasGesture: () =>
      gestured || browser.navigator?.userActivation?.hasBeenActive === true,
    isHidden: () => browser.document?.visibilityState === 'hidden',
    keepAwake,
    after(run, ms) {
      const id = browser.setTimeout(run, ms);
      return () => browser.clearTimeout(id);
    },
  };
}
