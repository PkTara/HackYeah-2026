import type { AudioContextLike, AudioParamLike } from '../music/audio.types';
import { sharedBrowserAudioContext } from '../music/webMusic';
import { SFX_GAIN } from '../sfx/effects';
import {
  IDLE_SUSPEND_MS,
  browserSfxEnvironment,
  createWebSfx,
  type SfxEnvironment,
} from '../sfx/webSfx';

function param(initial = 0): AudioParamLike {
  return {
    value: initial,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
    setTargetAtTime: jest.fn(),
    cancelScheduledValues: jest.fn(),
  };
}

function node() {
  return { connect: jest.fn(), disconnect: jest.fn() };
}

/** Just enough AudioContext to play buffers and count what started. */
function fakeContext() {
  const started: number[] = [];
  const gains: AudioParamLike[] = [];
  /** What happened, in order: 'start' and 'resume'. */
  const log: string[] = [];
  const ctx = {
    currentTime: 1.5,
    sampleRate: 8000,
    state: 'suspended',
    destination: node(),
    resume: jest.fn(async () => {
      log.push('resume');
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
    createBufferSource: () => ({
      ...node(),
      buffer: null,
      onended: null,
      start: (when: number) => {
        log.push('start');
        started.push(when);
      },
      stop: jest.fn(),
    }),
    createBuffer: jest.fn((channels: number, length: number) => {
      const data = new Float32Array(length);
      return { numberOfChannels: channels, length, getChannelData: () => data };
    }),
  };
  return { ctx: ctx as unknown as AudioContextLike & typeof ctx, started, gains, log };
}

function setUp() {
  const audio = fakeContext();
  let gesture = false;
  let hidden = false;
  let musicPlaying = false;
  let later: (() => void) | null = null;
  let laterMs = 0;
  const env: SfxEnvironment = {
    context: jest.fn(() => audio.ctx),
    hasGesture: () => gesture,
    isHidden: () => hidden,
    keepAwake: () => musicPlaying,
    after: (run, ms) => {
      later = run;
      laterMs = ms;
      return () => {
        later = null;
      };
    },
  };
  const sfx = createWebSfx(env);
  return {
    ...audio,
    env,
    sfx,
    tap: () => {
      gesture = true;
    },
    hide: (value: boolean) => {
      hidden = value;
    },
    music: (value: boolean) => {
      musicPlaying = value;
    },
    runTimer: () => {
      const run = later;
      later = null;
      run?.();
    },
    get timerMs() {
      return laterMs;
    },
  };
}

describe('web sound effects', () => {
  it('makes no AudioContext and plays nothing before the first gesture', () => {
    const t = setUp();
    t.sfx.play('typing', 72);
    t.sfx.play('tap');
    expect(t.env.context).not.toHaveBeenCalled();
    expect(t.started).toEqual([]);
  });

  it('plays after a gesture, on one context, through a quiet gain', () => {
    const t = setUp();
    t.tap();
    t.sfx.play('tap');
    t.sfx.play('success');
    expect(t.env.context).toHaveBeenCalledTimes(1);
    expect(t.started).toEqual([1.5, 1.5]);
    expect(t.gains[0].value).toBe(SFX_GAIN);
    expect(t.ctx.resume).toHaveBeenCalled();
  });

  it('goes through one gain straight out: no compressor and its make-up gain', () => {
    const t = setUp();
    t.tap();
    const gain = { ...t.ctx.createGain() };
    jest.spyOn(t.ctx, 'createGain').mockReturnValue(gain as never);
    t.sfx.play('tap');
    expect(gain.connect).toHaveBeenCalledWith(t.ctx.destination);
  });

  it('schedules the sound before waking a sleeping context', () => {
    const t = setUp();
    t.tap();
    t.sfx.play('tap');
    expect(t.log).toEqual(['start', 'resume']);
    // Awake now: later sounds just start.
    t.sfx.play('tap');
    expect(t.log).toEqual(['start', 'resume', 'start']);
  });

  it('is on by default; play does nothing while turned off', () => {
    const t = setUp();
    t.tap();
    expect(t.sfx.enabled).toBe(true);
    t.sfx.setEnabled(false);
    t.sfx.play('tap');
    t.sfx.play('levelUp');
    expect(t.started).toEqual([]);
    expect(t.env.context).not.toHaveBeenCalled();
  });

  it('keeps the setting until it is changed again', () => {
    const t = setUp();
    t.tap();
    t.sfx.setEnabled(false);
    t.sfx.play('tap');
    t.sfx.play('tap');
    expect(t.sfx.enabled).toBe(false);
    t.sfx.setEnabled(true);
    t.sfx.play('tap');
    expect(t.sfx.enabled).toBe(true);
    expect(t.started).toHaveLength(1);
  });

  it('is silent while the page is hidden', () => {
    const t = setUp();
    t.tap();
    t.hide(true);
    t.sfx.play('tap');
    expect(t.started).toEqual([]);
    t.hide(false);
    t.sfx.play('tap');
    expect(t.started).toHaveLength(1);
  });

  it('renders each effect once and reuses it, one buffer per typing pitch', () => {
    const t = setUp();
    t.tap();
    t.sfx.play('tap');
    t.sfx.play('tap');
    t.sfx.play('typing', 0);
    t.sfx.play('typing', 5); // the same pitch step as 0
    t.sfx.play('typing', 1);
    expect(t.ctx.createBuffer).toHaveBeenCalledTimes(3);
    expect(t.started).toHaveLength(5);
  });

  it('lets the context rest once the effects stop, unless the music plays', () => {
    const t = setUp();
    t.tap();
    t.sfx.play('tap');
    t.ctx.state = 'running';
    expect(t.timerMs).toBeGreaterThanOrEqual(IDLE_SUSPEND_MS);
    t.music(true);
    t.runTimer();
    expect(t.ctx.suspend).not.toHaveBeenCalled();

    t.music(false);
    t.sfx.play('tap');
    t.runTimer();
    expect(t.ctx.suspend).toHaveBeenCalledTimes(1);
  });

  it('never throws, even when the audio system does', () => {
    const t = setUp();
    t.tap();
    (t.env.context as jest.Mock).mockImplementation(() => {
      throw new Error('no audio device');
    });
    expect(() => t.sfx.play('tap')).not.toThrow();
  });
});

describe('the browser environment', () => {
  type Listener = () => void;
  const g = globalThis as unknown as Record<string, unknown>;
  let listeners: Map<string, Listener>;

  beforeEach(() => {
    listeners = new Map();
    g.addEventListener = (type: string, listener: Listener) =>
      listeners.set(type, listener);
    g.removeEventListener = (type: string) => listeners.delete(type);
  });

  afterEach(() => {
    delete g.addEventListener;
    delete g.removeEventListener;
    delete g.AudioContext;
  });

  it('counts the first tap, click or key press as the gesture', () => {
    const env = browserSfxEnvironment(jest.fn(), () => false)!;
    expect(env.hasGesture()).toBe(false);
    expect([...listeners.keys()].sort()).toEqual(['keydown', 'pointerup', 'touchend']);
    listeners.get('pointerup')!();
    expect(env.hasGesture()).toBe(true);
    // One gesture is enough; the listeners are gone.
    expect(listeners.size).toBe(0);
  });

  it('shares one lazily made AudioContext', () => {
    const made = jest.fn();
    g.AudioContext = class {
      constructor() {
        made();
      }
    };
    const context = sharedBrowserAudioContext()!;
    expect(made).not.toHaveBeenCalled();
    expect(context()).toBe(context());
    expect(made).toHaveBeenCalledTimes(1);
  });

  it('has no shared context where the browser has no Web Audio', () => {
    expect(sharedBrowserAudioContext()).toBeNull();
  });
});
