import {
  EFFECTS,
  SFX_GAIN,
  TYPING_STEPS,
  effectSeconds,
  renderEffect,
  typingStep,
} from '../sfx/effects';
import { MASTER_GAIN } from '../music/voices';
import type { SfxName } from '../types';

const NAMES = Object.keys(EFFECTS) as SfxName[];
const RATE = 22050;

function peak(samples: Float32Array) {
  let max = 0;
  for (const v of samples) {
    max = Math.max(max, Math.abs(v));
  }
  return max;
}

/** Seconds from the start until the sound first reaches its loudest. */
function timeToPeak(samples: Float32Array) {
  const top = peak(samples);
  return samples.findIndex(v => Math.abs(v) === top) / RATE;
}

describe('the effect table', () => {
  it('has every effect the capability names', () => {
    expect(NAMES.sort()).toEqual(['levelUp', 'select', 'success', 'tap', 'typing']);
  });

  it('keeps the small sounds under 150 ms and the rewards near 400 ms', () => {
    for (const name of ['typing', 'tap', 'select'] as const) {
      expect(effectSeconds(name)).toBeLessThanOrEqual(0.15);
    }
    for (const name of ['success', 'levelUp'] as const) {
      expect(effectSeconds(name)).toBeGreaterThan(0.3);
      expect(effectSeconds(name)).toBeLessThanOrEqual(0.45);
    }
  });

  it('renders each effect at the length the table says', () => {
    for (const name of NAMES) {
      expect(renderEffect(name, RATE).length / RATE).toBeCloseTo(
        effectSeconds(name),
        2,
      );
    }
  });

  it('has no randomness, so every play sounds the same', () => {
    for (const name of NAMES) {
      for (const note of EFFECTS[name]) {
        expect(note.params[1]).toBe(0);
      }
      expect(renderEffect(name, RATE)).toEqual(renderEffect(name, RATE));
    }
  });

  it('keeps every note soft: low volume and a low-pass filter', () => {
    for (const name of NAMES) {
      for (const note of EFFECTS[name]) {
        const [volume, , frequency, , , , , , , , , , , , , , , , , , filter] =
          note.params;
        expect(volume).toBeGreaterThan(0);
        expect(volume).toBeLessThanOrEqual(0.5);
        // Nothing above D6 (the music's ceiling), and a low-pass under 3.2 kHz.
        expect(frequency).toBeLessThanOrEqual(1175);
        expect(filter).toBeLessThan(0);
        expect(filter).toBeGreaterThanOrEqual(-3200);
      }
    }
  });

  it('never clips, and the mixed level sits well under the music', () => {
    expect(SFX_GAIN).toBeGreaterThanOrEqual(0.08);
    expect(SFX_GAIN).toBeLessThanOrEqual(0.12);
    expect(SFX_GAIN).toBeLessThan(MASTER_GAIN);
    for (const name of NAMES) {
      const samples = renderEffect(name, RATE);
      expect(samples.every(Number.isFinite)).toBe(true);
      expect(peak(samples)).toBeGreaterThan(0.1);
      expect(peak(samples)).toBeLessThanOrEqual(0.8);
      // After the gain: at most -22 dBFS.
      expect(peak(samples) * SFX_GAIN).toBeLessThanOrEqual(0.08);
    }
  });

  it('makes the typing murmur the quietest sound', () => {
    const typing = peak(renderEffect('typing', RATE));
    for (const name of NAMES.filter(n => n !== 'typing')) {
      expect(typing).toBeLessThanOrEqual(peak(renderEffect(name, RATE)));
    }
  });

  it('rises: the reward sounds peak after their first note', () => {
    expect(timeToPeak(renderEffect('success', RATE))).toBeGreaterThan(0.05);
    const notes = EFFECTS.levelUp.map(n => n.params[2] ?? 0);
    expect([...notes].sort((a, b) => a - b)).toEqual(notes);
  });
});

describe('typing pitch steps', () => {
  it('folds any letter code onto the pentatonic steps, also negative ones', () => {
    expect(typingStep(0)).toBe(0);
    expect(typingStep(TYPING_STEPS.length)).toBe(0);
    expect(typingStep('a'.charCodeAt(0))).toBe(97 % TYPING_STEPS.length);
    expect(typingStep(-1)).toBe(TYPING_STEPS.length - 1);
  });

  it('gives each step its own pitch, and the same letter the same sound', () => {
    const renders = TYPING_STEPS.map((_, step) => renderEffect('typing', RATE, step));
    for (let i = 1; i < renders.length; i++) {
      expect(renders[i]).not.toEqual(renders[0]);
    }
    expect(renderEffect('typing', RATE, 104)).toEqual(renderEffect('typing', RATE, 104));
  });

  it('only moves the pitch of the typing murmur', () => {
    expect(renderEffect('tap', RATE, 3)).toEqual(renderEffect('tap', RATE, 0));
  });
});
