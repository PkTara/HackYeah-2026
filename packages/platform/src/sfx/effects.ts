/**
 * The sound effects as plain data: each one is a few ZzFX notes (zzfx.ts)
 * started at fixed times and mixed into one buffer. No audio files.
 *
 * All of them are short, soft and in the music's key (G major), with
 * low-pass filters so nothing is shrill. Randomness is always 0, so an
 * effect sounds the same every time and tests can check the samples.
 *
 * Parameter order (ZzFX): volume, randomness, frequency, attack, sustain,
 * release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime,
 * repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay,
 * tremolo, filter. Shape 0 is sine, 1 triangle. A negative filter is a
 * low-pass at that many Hz.
 */
import type { SfxName } from '../types';
import { buildSamples, type ZzfxParams } from './zzfx';

/** Level of every effect after mixing. Well under the music (0.18). */
export const SFX_GAIN = 0.1;

export type SfxNote = Readonly<{
  /** Start, in seconds from the start of the effect. */
  at: number;
  params: ZzfxParams;
}>;

/** Semitone steps for the typing murmur: a G major pentatonic. */
export const TYPING_STEPS = [0, 2, 4, 7, 9] as const;

const G4 = 392;
const B4 = 493.88;
const D5 = 587.33;
const G5 = 783.99;

/** A soft triangle note with a short tail, for the reward sounds. */
function bell(frequency: number, sustain: number, release: number): ZzfxParams {
  // prettier-ignore
  return [0.4, 0, frequency, 0.008, sustain, release, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.03, 0, -2600];
}

/* prettier-ignore */
export const EFFECTS: Readonly<Record<SfxName, readonly SfxNote[]>> = {
  // A low, round blip, like a murmur. The typing variant moves its pitch.
  typing: [{ at: 0, params: [0.35, 0, 262, 0.004, 0.012, 0.03, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -1400] }],
  // A soft wooden click: a quick sine that falls in pitch.
  tap: [{ at: 0, params: [0.5, 0, 520, 0, 0.004, 0.035, 0, 1, -6, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -2200] }],
  // A slightly brighter tick that steps up a fourth.
  select: [{ at: 0, params: [0.45, 0, D5, 0.002, 0.012, 0.045, 1, 1, 0, 0, G5 - D5, 0.022, 0, 0, 0, 0, 0, 1, 0, 0, -3000] }],
  // Two notes rising a fourth: D5, then G5.
  success: [
    { at: 0, params: bell(D5, 0.05, 0.16) },
    { at: 0.1, params: bell(G5, 0.08, 0.2) },
  ],
  // A quick G major arpeggio up to the octave.
  levelUp: [
    { at: 0, params: bell(G4, 0.02, 0.1) },
    { at: 0.065, params: bell(B4, 0.02, 0.1) },
    { at: 0.13, params: bell(D5, 0.02, 0.1) },
    { at: 0.195, params: bell(G5, 0.05, 0.14) },
  ],
};

/** Length of one ZzFX note in seconds (attack, decay, sustain, release, delay). */
export function noteSeconds(params: ZzfxParams): number {
  const attack = params[3] ?? 0;
  const sustain = params[4] ?? 0;
  const release = params[5] ?? 0.1;
  const delay = params[16] ?? 0;
  const decay = params[18] ?? 0;
  return attack + decay + sustain + release + delay;
}

/** Length of a whole effect in seconds. */
export function effectSeconds(name: SfxName): number {
  return Math.max(...EFFECTS[name].map(n => n.at + noteSeconds(n.params)));
}

/** Folds any variant onto one of the TYPING_STEPS. */
export function typingStep(variant: number): number {
  const steps = TYPING_STEPS.length;
  return ((Math.round(variant) % steps) + steps) % steps;
}

/** The notes of an effect, with the typing pitch step applied. */
function notesFor(name: SfxName, variant: number): readonly SfxNote[] {
  const notes = EFFECTS[name];
  if (name !== 'typing') {
    return notes;
  }
  const ratio = Math.pow(2, TYPING_STEPS[typingStep(variant)] / 12);
  return notes.map(note => {
    const params = [...note.params];
    params[2] = (params[2] ?? 220) * ratio;
    return { at: note.at, params: params as unknown as ZzfxParams };
  });
}

/**
 * Renders an effect to mono samples at `sampleRate`, before SFX_GAIN.
 * Pure: the same arguments always give the same samples.
 */
export function renderEffect(
  name: SfxName,
  sampleRate: number,
  variant = 0,
): Float32Array {
  const notes = notesFor(name, variant).map(note => ({
    start: Math.round(note.at * sampleRate),
    samples: buildSamples(sampleRate, ...note.params),
  }));
  const length = Math.max(...notes.map(n => n.start + n.samples.length));
  const mix = new Float32Array(length);
  for (const note of notes) {
    for (let i = 0; i < note.samples.length; i++) {
      mix[note.start + i] += note.samples[i];
    }
  }
  return mix;
}
