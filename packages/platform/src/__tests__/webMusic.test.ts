import type {
  AudioContextLike,
  AudioParamLike,
} from '../music/audio.types';
import { FADE_IN, FADE_OUT, createWebMusic, type MusicEnvironment } from '../music/webMusic';
import { MASTER_GAIN } from '../music/voices';

/** An AudioParam that records its automation. */
function param(initial = 0) {
  const events: [string, number, number][] = [];
  const p: AudioParamLike & { events: typeof events } = {
    value: initial,
    events,
    setValueAtTime: (v, t) => events.push(['set', v, t]),
    linearRampToValueAtTime: (v, t) => events.push(['ramp', v, t]),
    exponentialRampToValueAtTime: (v, t) => events.push(['exp', v, t]),
    setTargetAtTime: (v, t) => events.push(['target', v, t]),
    cancelScheduledValues: t => events.push(['cancel', 0, t]),
  };
  return p;
}

function node() {
  return { connect: jest.fn(), disconnect: jest.fn() };
}

/** Just enough AudioContext to build the band and count started sounds. */
function fakeContext() {
  const gains: ReturnType<typeof param>[] = [];
  const started: number[] = [];
  const source = () => ({
    ...node(),
    start: (when: number) => started.push(when),
    stop: jest.fn(),
    onended: null,
  });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    state: 'suspended',
    destination: node(),
    resume: jest.fn(async () => {
      ctx.state = 'running';
    }),
    suspend: jest.fn(async () => {
      ctx.state = 'suspended';
    }),
    createGain: () => {
      const gain = param(1);
      gains.push(gain);
      return { ...node(), gain };
    },
    createOscillator: () => ({ ...source(), type: 'sine', frequency: param() }),
    createBufferSource: () => ({ ...source(), buffer: null }),
    createBiquadFilter: () => ({
      ...node(),
      type: 'lowpass',
      frequency: param(),
      Q: param(),
    }),
    createBuffer: (channels: number, length: number) => ({
      numberOfChannels: channels,
      length,
      getChannelData: () => new Float32Array(length),
    }),
    createConvolver: () => ({ ...node(), buffer: null, normalize: true }),
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
    }),
    createStereoPanner: () => ({ ...node(), pan: param() }),
  };
  return { ctx: ctx as AudioContextLike & typeof ctx, gains, started };
}

function setUp() {
  const audio = fakeContext();
  let tick: (() => void) | null = null;
  let later: (() => void) | null = null;
  let visibility: ((hidden: boolean) => void) | null = null;
  let gesture: (() => void) | null = null;
  const env: MusicEnvironment = {
    createContext: jest.fn(() => audio.ctx),
    every: (run: () => void) => {
      tick = run;
      return () => {
        tick = null;
      };
    },
    after: (run: () => void) => {
      later = run;
      return () => {
        later = null;
      };
    },
    onVisibilityChange: listener => {
      visibility = listener;
      return () => {};
    },
    onNextGesture: listener => {
      gesture = listener;
      return () => {
        gesture = null;
      };
    },
  };
  const music = createWebMusic(env);
  /** Moves the audio clock and runs the scheduler's timer. */
  const advance = (seconds: number) => {
    for (let i = 0; i < seconds * 20; i++) {
      audio.ctx.currentTime += 0.05;
      tick?.();
    }
  };
  return {
    ...audio,
    env,
    music,
    advance,
    runLater: () => later?.(),
    setHidden: (hidden: boolean) => visibility?.(hidden),
    gesture: () => gesture?.(),
    get ticking() {
      return tick !== null;
    },
    get waitingForGesture() {
      return gesture !== null;
    },
  };
}

/** The fade gain is the only gain that starts at 0 and ramps on play. */
function fadeGain(gains: ReturnType<typeof param>[]) {
  const fade = gains.find(g => g.events.some(e => e[0] === 'ramp' && e[1] === 1));
  if (!fade) {
    throw new Error('no fade gain');
  }
  return fade;
}

describe('createWebMusic', () => {
  it('makes no audio context until the first play', async () => {
    const t = setUp();
    expect(t.env.createContext).not.toHaveBeenCalled();
    expect(t.music.playing).toBe(false);
    await t.music.play();
    expect(t.env.createContext).toHaveBeenCalledTimes(1);
    expect(t.ctx.resume).toHaveBeenCalled();
    expect(t.music.playing).toBe(true);
  });

  it('fades in over FADE_IN seconds and sets a quiet master level', async () => {
    const t = setUp();
    await t.music.play();
    const fade = fadeGain(t.gains);
    expect(fade.value).toBe(0);
    expect(fade.events).toContainEqual(['ramp', 1, FADE_IN]);
    expect(t.gains.some(g => g.value === MASTER_GAIN)).toBe(true);
    expect(MASTER_GAIN).toBeGreaterThanOrEqual(0.15);
    expect(MASTER_GAIN).toBeLessThanOrEqual(0.2);
  });

  it('schedules notes ahead while playing', async () => {
    const t = setUp();
    await t.music.play();
    const first = t.started.length;
    expect(first).toBeGreaterThan(0);
    t.advance(3);
    expect(t.started.length).toBeGreaterThan(first);
    expect(Math.max(...t.started)).toBeLessThanOrEqual(t.ctx.currentTime + 0.3);
  });

  it('fades out on stop, stops scheduling, then suspends the context', async () => {
    const t = setUp();
    await t.music.play();
    t.advance(2);
    t.music.stop();
    expect(t.music.playing).toBe(false);
    expect(t.ticking).toBe(false);
    const fade = fadeGain(t.gains);
    expect(fade.events).toContainEqual(['ramp', 0, t.ctx.currentTime + FADE_OUT]);
    const count = t.started.length;
    t.advance(2);
    expect(t.started.length).toBe(count);
    t.runLater();
    expect(t.ctx.suspend).toHaveBeenCalled();
  });

  it('plays again with the same context after a stop', async () => {
    const t = setUp();
    await t.music.play();
    t.music.stop();
    t.runLater();
    await t.music.play();
    expect(t.env.createContext).toHaveBeenCalledTimes(1);
    expect(t.ctx.state).toBe('running');
    expect(t.ticking).toBe(true);
  });

  it('does not suspend if played again before the fade-out ends', async () => {
    const t = setUp();
    await t.music.play();
    t.music.stop();
    await t.music.play();
    t.runLater();
    expect(t.ctx.suspend).not.toHaveBeenCalled();
  });

  it('pauses while the page is hidden and carries on when it is visible', async () => {
    const t = setUp();
    await t.music.play();
    t.setHidden(true);
    expect(t.ctx.suspend).toHaveBeenCalledTimes(1);
    expect(t.music.playing).toBe(true);
    t.ctx.resume.mockClear();
    t.setHidden(false);
    expect(t.ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('leaves a stopped player alone when the page is shown again', async () => {
    const t = setUp();
    await t.music.play();
    t.music.stop();
    t.ctx.resume.mockClear();
    t.setHidden(true);
    t.setHidden(false);
    expect(t.ctx.resume).not.toHaveBeenCalled();
  });

  it('passes gesture waits through to the environment, cancellable', () => {
    const t = setUp();
    const listener = jest.fn();
    const cancel = t.music.onNextGesture(listener);
    expect(t.waitingForGesture).toBe(true);
    cancel();
    expect(t.waitingForGesture).toBe(false);
    t.music.onNextGesture(listener);
    t.gesture();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores a second play and a stop before any play', async () => {
    const t = setUp();
    t.music.stop();
    expect(t.env.createContext).not.toHaveBeenCalled();
    await t.music.play();
    const count = t.started.length;
    await t.music.play();
    expect(t.started.length).toBe(count);
  });
});
