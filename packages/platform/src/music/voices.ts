/**
 * The band, synthesised with Web Audio: no samples or audio files.
 *
 * Signal path: each note starts a few oscillators (or a noise burst) with a
 * short envelope, into its instrument's bus (level, stereo position, reverb
 * send), into the fade gain (fades in on play, out on stop), the master gain
 * and a compressor that keeps peaks in check.
 */
import type {
  AudioBufferLike,
  AudioContextLike,
  AudioNodeLike,
  GainNodeLike,
} from './audio.types';
import type { Instrument, TimedNote } from './song';

/** Overall level. Quiet on purpose: the music sits under the app. */
export const MASTER_GAIN = 0.18;

type Bus = Readonly<{ level: number; pan: number; reverb: number }>;

/** Mix: level, left/right position (-1 to 1) and reverb send. */
const BUSES: Readonly<Record<Instrument, Bus>> = {
  pan: { level: 1, pan: -0.15, reverb: 0.35 },
  marimba: { level: 0.8, pan: 0.25, reverb: 0.25 },
  kalimba: { level: 0.75, pan: -0.3, reverb: 0.4 },
  bass: { level: 1, pan: 0, reverb: 0 },
  shaker: { level: 0.7, pan: 0.35, reverb: 0.15 },
  drumLow: { level: 0.85, pan: -0.1, reverb: 0.12 },
  drumHigh: { level: 0.75, pan: 0.15, reverb: 0.12 },
};

export const hz = (pitch: number) => 440 * Math.pow(2, (pitch - 69) / 12);

/** Small fixed random generator, so the noise and reverb are the same every time. */
function noiseSource(seed: number) {
  // Linear congruential generator modulo 2^32. The product stays below
  // 2^53, so plain number arithmetic is exact.
  const modulus = 4294967296;
  let state = seed % modulus;
  return () => {
    state = (state * 1664525 + 1013904223) % modulus;
    return state / modulus - 0.5;
  };
}

function noiseBuffer(ctx: AudioContextLike, seconds: number): AudioBufferLike {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const random = noiseSource(7);
  for (let i = 0; i < length; i++) {
    data[i] = random() * 2;
  }
  return buffer;
}

/** A short warm room: decaying noise, slightly different per channel. */
function reverbImpulse(ctx: AudioContextLike): AudioBufferLike {
  const seconds = 1.6;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    const random = noiseSource(101 + channel);
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = random() * Math.exp(-t / 0.35) * (t < 0.012 ? t / 0.012 : 1);
    }
  }
  return buffer;
}

type Partial = Readonly<{
  /** Frequency as a multiple of the note. */
  ratio: number;
  /** Peak level at full velocity. */
  level: number;
  /** Decay time constant in seconds. */
  decay: number;
  type?: string;
}>;

/** One sine (or other wave) with a fast attack and an exponential decay. */
function ping(
  ctx: AudioContextLike,
  out: AudioNodeLike,
  frequency: number,
  peak: number,
  decay: number,
  when: number,
  type = 'sine',
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const attack = 0.004;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(peak, when + attack);
  env.gain.setTargetAtTime(0, when + attack, decay);
  osc.connect(env);
  env.connect(out);
  osc.start(when);
  // Eight time constants: the tail is far below hearing when it stops.
  osc.stop(when + attack + decay * 8);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
  };
}

function additive(
  ctx: AudioContextLike,
  out: AudioNodeLike,
  note: TimedNote,
  when: number,
  partials: readonly Partial[],
  stretch = 1,
) {
  const base = hz(note.pitch);
  for (const partial of partials) {
    ping(
      ctx,
      out,
      base * partial.ratio,
      partial.level * note.velocity,
      partial.decay * stretch,
      when,
      partial.type,
    );
  }
}

/**
 * Steel drum: the fundamental, the octave and the twelfth decay at
 * different speeds, plus a slightly detuned copy for the shimmer.
 */
const PAN: readonly Partial[] = [
  { ratio: 1, level: 0.3, decay: 0.42 },
  { ratio: 1.004, level: 0.09, decay: 0.4 },
  { ratio: 2, level: 0.14, decay: 0.22 },
  { ratio: 3, level: 0.055, decay: 0.1 },
  { ratio: 4.2, level: 0.018, decay: 0.04 },
];
/** Marimba: a round sine with its bright fourth partial knocked in quickly. */
const MARIMBA: readonly Partial[] = [
  { ratio: 1, level: 0.19, decay: 0.26 },
  { ratio: 4, level: 0.035, decay: 0.03 },
];
/** Kalimba: a sine with a short metallic tine. */
const KALIMBA: readonly Partial[] = [
  { ratio: 1, level: 0.15, decay: 0.34 },
  { ratio: 5.4, level: 0.018, decay: 0.02 },
];

function bassNote(
  ctx: AudioContextLike,
  out: AudioNodeLike,
  note: TimedNote,
  when: number,
) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(420, when);
  filter.Q.setValueAtTime(0.7, when);
  const env = ctx.createGain();
  const peak = 0.35 * note.velocity;
  const end = when + Math.max(0.1, note.duration * 0.9);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(peak, when + 0.012);
  env.gain.setTargetAtTime(peak * 0.55, when + 0.012, 0.25);
  env.gain.setTargetAtTime(0, end, 0.04);
  filter.connect(env);
  env.connect(out);
  const oscs = [1, 2].map(ratio => {
    const osc = ctx.createOscillator();
    const level = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz(note.pitch) * ratio, when);
    level.gain.setValueAtTime(ratio === 1 ? 1 : 0.2, when);
    osc.connect(level);
    level.connect(filter);
    osc.start(when);
    osc.stop(end + 0.4);
    return { osc, level };
  });
  oscs[0].osc.onended = () => {
    for (const { osc, level } of oscs) {
      osc.disconnect();
      level.disconnect();
    }
    filter.disconnect();
    env.disconnect();
  };
}

function shaker(
  ctx: AudioContextLike,
  out: AudioNodeLike,
  note: TimedNote,
  when: number,
  noise: AudioBufferLike,
) {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(6000, when);
  filter.Q.setValueAtTime(0.7, when);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(0.07 * note.velocity, when + 0.008);
  env.gain.setTargetAtTime(0, when + 0.008, 0.028);
  source.connect(filter);
  filter.connect(env);
  env.connect(out);
  // A different slice of the noise each time, picked from the step.
  source.start(when, ((note.step * 0.137) % 0.6) + 0.05);
  source.stop(when + 0.3);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    env.disconnect();
  };
}

/** Soft hand drum: a sine that drops quickly in pitch. */
function handDrum(
  ctx: AudioContextLike,
  out: AudioNodeLike,
  note: TimedNote,
  when: number,
  low: boolean,
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const pitch = low ? 98 : 185;
  const peak = (low ? 0.55 : 0.28) * note.velocity;
  const decay = low ? 0.1 : 0.07;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch * 1.6, when);
  osc.frequency.exponentialRampToValueAtTime(pitch, when + 0.035);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(peak, when + 0.003);
  env.gain.setTargetAtTime(0, when + 0.003, decay);
  osc.connect(env);
  env.connect(out);
  osc.start(when);
  osc.stop(when + decay * 9);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
  };
}

export type MusicGraph = Readonly<{
  /** Fades in on play and out on stop; 0 is silent. */
  fade: GainNodeLike;
  playNote(note: TimedNote, when: number): void;
}>;

/** Builds the mixer once per context and returns a note player for it. */
export function createMusicGraph(
  ctx: AudioContextLike,
  volume = MASTER_GAIN,
): MusicGraph {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 6;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.connect(ctx.destination);

  // Small speakers can't play deep rumble anyway; take it out of the mix.
  const lowCut = ctx.createBiquadFilter();
  lowCut.type = 'highpass';
  lowCut.frequency.value = 45;
  lowCut.Q.value = 0.7;
  lowCut.connect(compressor);

  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(lowCut);

  const fade = ctx.createGain();
  fade.gain.value = 0;
  fade.connect(master);

  const reverb = ctx.createConvolver();
  reverb.normalize = true;
  reverb.buffer = reverbImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  reverb.connect(wet);
  wet.connect(fade);

  const buses = {} as Record<Instrument, GainNodeLike>;
  for (const [name, bus] of Object.entries(BUSES) as [Instrument, Bus][]) {
    const input = ctx.createGain();
    input.gain.value = bus.level;
    let out: AudioNodeLike = input;
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = bus.pan;
      input.connect(panner);
      out = panner;
    }
    out.connect(fade);
    if (bus.reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = bus.reverb;
      out.connect(send);
      send.connect(reverb);
    }
    buses[name] = input;
  }

  const noise = noiseBuffer(ctx, 1);

  return {
    fade,
    playNote(note, when) {
      const out = buses[note.instrument];
      switch (note.instrument) {
        case 'pan':
          // Longer notes ring a little longer.
          additive(ctx, out, note, when, PAN, 0.8 + Math.min(note.duration, 1.2) * 0.5);
          break;
        case 'marimba':
          additive(ctx, out, note, when, MARIMBA);
          break;
        case 'kalimba':
          additive(ctx, out, note, when, KALIMBA);
          break;
        case 'bass':
          bassNote(ctx, out, note, when);
          break;
        case 'shaker':
          shaker(ctx, out, note, when, noise);
          break;
        case 'drumLow':
        case 'drumHigh':
          handDrum(ctx, out, note, when, note.instrument === 'drumLow');
          break;
      }
    },
  };
}
