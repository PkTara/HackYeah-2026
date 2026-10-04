/**
 * The background music, as plain data: an original island loop written for
 * Climbing Monkey. Nothing here touches audio; arrange() turns the song into
 * a flat, timed list of notes that the Web Audio engine (webMusic.ts) plays
 * and the tests check.
 *
 * Time is counted in steps of one eighth note, 8 per 4/4 bar. Off-beat
 * eighths are swung (played late), which gives the lazy calypso feel.
 *
 * It lives in platform next to its only player, not in core: core is the
 * climbing domain, and this is a sound asset written as code.
 */

export const STEPS_PER_BAR = 8;

export type Instrument =
  | 'pan' // steel drum lead
  | 'marimba' // chords
  | 'kalimba' // arpeggios in the B section
  | 'bass'
  | 'shaker'
  | 'drumLow'
  | 'drumHigh';

/** Lowest and highest MIDI note each pitched instrument is written for. */
export const RANGES: Readonly<Record<Instrument, readonly [number, number]>> = {
  pan: [60, 91], // C4 to G6
  marimba: [50, 79],
  kalimba: [60, 96],
  bass: [28, 60],
  shaker: [0, 0],
  drumLow: [0, 0],
  drumHigh: [0, 0],
};

/** How the marimba or kalimba accompanies a section. */
export type CompStyle = 'calypso' | 'offbeat' | 'arp' | 'downbeat';
export type BassStyle = 'calypso' | 'walk';
export type DrumStyle = 'groove' | 'soft';

export type Section = Readonly<{
  name: string;
  /** One entry per bar. Two chords ("Gm7 C7") split the bar in half. */
  chords: readonly string[];
  /**
   * Steel drum melody, one entry per bar: "pitch:steps" tokens, with "-"
   * for a rest. Every bar adds up to 8 steps.
   */
  melody: readonly string[];
  comp: readonly CompStyle[];
  bass: BassStyle;
  drums: DrumStyle;
}>;

export type Song = Readonly<{
  title: string;
  bpm: number;
  /** Where the off-beat eighth falls inside the beat (0.5 is straight). */
  swing: number;
  key: string;
  sections: readonly Section[];
  /** Section names in playing order. The end loops back to the start. */
  form: readonly string[];
}>;

export const SONG: Song = {
  title: 'Canopy Breeze',
  bpm: 100,
  swing: 0.6,
  key: 'F major',
  form: ['A', 'B', 'A2'],
  sections: [
    {
      name: 'A',
      chords: ['F', 'Bb', 'F', 'C7', 'F', 'Bb', 'Gm7 C7', 'F'],
      melody: [
        'C5:1 F5:2 A5:1 -:1 G5:1 F5:2',
        'D5:2 F5:1 G5:2 F5:1 D5:2',
        'C5:1 F5:2 A5:1 -:1 C6:1 A5:2',
        'G5:3 E5:1 -:1 C5:1 E5:1 G5:1',
        'A5:1 C6:2 A5:1 -:1 G5:1 F5:2',
        'D5:1 F5:2 D5:1 Bb4:2 C5:2',
        'D5:2 Bb4:1 G4:1 E5:2 C5:1 E5:1',
        'F5:3 -:5',
      ],
      comp: ['calypso'],
      bass: 'calypso',
      drums: 'groove',
    },
    {
      name: 'B',
      chords: ['Bb', 'Bb', 'F', 'Dm', 'Gm7', 'C7', 'Am7 Dm7', 'Gm7 C7'],
      melody: [
        'F5:3 D5:3 C5:2',
        'D5:2 F5:1 -:1 Bb5:3 A5:1',
        'A5:3 F5:3 C5:2',
        'D5:2 E5:1 F5:1 -:1 A5:3',
        'Bb5:3 A5:3 G5:2',
        'E5:2 G5:1 Bb5:1 -:1 G5:1 E5:2',
        'C5:2 E5:2 F5:2 A5:2',
        'G5:3 Bb5:1 -:2 E5:1 G5:1',
      ],
      comp: ['arp', 'downbeat'],
      bass: 'walk',
      drums: 'soft',
    },
    {
      name: 'A2',
      chords: ['F', 'Bb', 'F', 'C7', 'Dm', 'Bb', 'Gm7 C7', 'F C7'],
      melody: [
        'C5:1 F5:2 A5:1 -:1 G5:1 A5:1 C6:1',
        'D6:2 C6:1 Bb5:2 A5:1 F5:2',
        'C5:1 F5:2 A5:1 -:1 C6:1 A5:2',
        'G5:2 Bb5:1 G5:1 -:1 E5:1 C5:2',
        'F5:1 A5:2 D6:1 -:1 C6:1 A5:2',
        'Bb5:2 A5:1 F5:1 -:1 D5:1 F5:2',
        'G5:3 F5:1 E5:2 G5:2',
        'F5:2 -:2 Bb4:1 C5:1 E5:1 -:1',
      ],
      comp: ['offbeat'],
      bass: 'calypso',
      drums: 'groove',
    },
  ],
};

export type NoteEvent = Readonly<{
  instrument: Instrument;
  /** Steps from the start of the loop. */
  step: number;
  /** Length in steps. */
  length: number;
  /** MIDI note number; 0 for drums and shaker. */
  pitch: number;
  /** 0 to 1. */
  velocity: number;
}>;

/** A note with its place in seconds from the start of the loop. */
export type TimedNote = NoteEvent &
  Readonly<{
    time: number;
    duration: number;
  }>;

export type Arrangement = Readonly<{
  bars: number;
  totalSteps: number;
  /** Length of one pass in seconds; the loop restarts exactly here. */
  loopSeconds: number;
  /** Sorted by time. */
  notes: readonly TimedNote[];
}>;

// Pitches -------------------------------------------------------------------

const PITCH_CLASS: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** "Bb4" to a MIDI number (C4 is 60). */
export function midi(name: string): number {
  const match = /^([A-G])(b|#)?(-?\d)$/.exec(name);
  if (!match) {
    throw new Error(`Not a note name: ${name}`);
  }
  const accidental = match[2] === 'b' ? -1 : match[2] === '#' ? 1 : 0;
  return 12 * (Number(match[3]) + 1) + PITCH_CLASS[match[1]] + accidental;
}

const QUALITIES: Readonly<Record<string, readonly number[]>> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
};

export type Chord = Readonly<{ root: number; intervals: readonly number[] }>;

/** "Gm7" to its root pitch class (0 to 11) and intervals. */
export function parseChord(symbol: string): Chord {
  const match = /^([A-G])(b|#)?(.*)$/.exec(symbol);
  const intervals = match ? QUALITIES[match[3]] : undefined;
  if (!match || !intervals) {
    throw new Error(`Not a chord: ${symbol}`);
  }
  const accidental = match[2] === 'b' ? -1 : match[2] === '#' ? 1 : 0;
  return {
    root: (PITCH_CLASS[match[1]] + accidental + 12) % 12,
    intervals,
  };
}

/**
 * Close voicing for the marimba, between A3 and G#4. Four-note chords drop
 * the root, which the bass already plays.
 */
export function voicing(chord: Chord): number[] {
  const tones = chord.intervals.length > 3 ? chord.intervals.slice(1) : chord.intervals;
  return tones
    .map(interval => {
      const pc = (chord.root + interval) % 12;
      let note = 48 + pc;
      while (note < 57) {
        note += 12;
      }
      return note;
    })
    .sort((a, b) => a - b);
}

/** Bass root in the octave from C2 up to B2. */
const bassRoot = (chord: Chord) => 36 + chord.root;

// Tokens --------------------------------------------------------------------

export type Token = Readonly<{ pitch: number | null; length: number }>;

/** "C5:1 -:2" to notes and rests. */
export function parseBar(bar: string): Token[] {
  return bar
    .trim()
    .split(/\s+/)
    .map(token => {
      const [name, steps] = token.split(':');
      const length = Number(steps);
      if (!Number.isInteger(length) || length <= 0) {
        throw new Error(`Bad length in ${token}`);
      }
      return { pitch: name === '-' ? null : midi(name), length };
    });
}

/** The chord sounding at each step of a bar. */
export function chordsOfBar(bar: string): Chord[] {
  const symbols = bar.trim().split(/\s+/);
  const span = STEPS_PER_BAR / symbols.length;
  const chords = symbols.map(parseChord);
  return Array.from(
    { length: STEPS_PER_BAR },
    (_, step) => chords[Math.floor(step / span)],
  );
}

/** Where each chord of a bar starts and how many steps it lasts. */
function chordSpans(bar: string) {
  const symbols = bar.trim().split(/\s+/);
  const span = STEPS_PER_BAR / symbols.length;
  return symbols.map((symbol, i) => ({
    chord: parseChord(symbol),
    start: i * span,
    length: span,
  }));
}

// Patterns ------------------------------------------------------------------

type Hit = Readonly<{ at: number; length: number; velocity: number }>;

/** Marimba stabs in the 3 + 3 + 2 calypso rhythm. */
const CALYPSO: readonly Hit[] = [
  { at: 0, length: 2, velocity: 0.8 },
  { at: 3, length: 2, velocity: 0.6 },
  { at: 6, length: 2, velocity: 0.7 },
];
const OFFBEAT: readonly Hit[] = [1, 3, 5, 7].map((at, i) => ({
  at,
  length: 1,
  velocity: i % 2 ? 0.5 : 0.6,
}));
const DOWNBEAT: readonly Hit[] = [{ at: 0, length: 4, velocity: 0.55 }];
/** Kalimba walks up and down the chord, an octave above the marimba. */
const ARP_ORDER = [0, 1, 2, 3, 2, 1, 2, 1];

function comp(style: CompStyle, bar: string, barStart: number): NoteEvent[] {
  const chords = chordsOfBar(bar);
  if (style === 'arp') {
    return ARP_ORDER.map((index, step) => {
      const voiced = voicing(chords[step]);
      const tones = [...voiced, voiced[0] + 12];
      return {
        instrument: 'kalimba' as const,
        step: barStart + step,
        length: 1,
        pitch: tones[index] + 12,
        velocity: step % 2 ? 0.4 : 0.5,
      };
    });
  }
  const hits =
    style === 'calypso' ? CALYPSO : style === 'offbeat' ? OFFBEAT : DOWNBEAT;
  return hits.flatMap(hit =>
    voicing(chords[hit.at]).map(pitch => ({
      instrument: 'marimba' as const,
      step: barStart + hit.at,
      length: hit.length,
      pitch,
      velocity: hit.velocity,
    })),
  );
}

/** Bass notes as [step in chord, interval above the root, length, velocity]. */
const BASS: Readonly<
  Record<BassStyle, Readonly<Record<number, readonly (readonly number[])[]>>>
> = {
  calypso: {
    8: [
      [0, 0, 2, 0.9],
      [3, 0, 1, 0.6],
      [4, 7, 2, 0.8],
      [6, 12, 2, 0.6],
    ],
    4: [
      [0, 0, 2, 0.9],
      [3, 7, 1, 0.6],
    ],
  },
  walk: {
    8: [
      [0, 0, 3, 0.9],
      [3, 7, 1, 0.6],
      [4, 12, 2, 0.75],
      [6, 7, 2, 0.6],
    ],
    4: [
      [0, 0, 2, 0.9],
      [2, 7, 2, 0.65],
    ],
  },
};

function bass(style: BassStyle, bar: string, barStart: number): NoteEvent[] {
  return chordSpans(bar).flatMap(({ chord, start, length }) =>
    (BASS[style][length] ?? []).map(([at, interval, steps, velocity]) => ({
      instrument: 'bass' as const,
      step: barStart + start + at,
      length: steps,
      pitch: bassRoot(chord) + interval,
      velocity,
    })),
  );
}

const SHAKER = [0.6, 0.3, 0.45, 0.3, 0.6, 0.3, 0.45, 0.3];
type DrumHit = readonly [Instrument, number, number];
const DRUMS: Readonly<Record<DrumStyle, readonly DrumHit[]>> = {
  groove: [
    ['drumLow', 0, 0.8],
    ['drumHigh', 3, 0.5],
    ['drumLow', 4, 0.5],
    ['drumHigh', 6, 0.6],
    ['drumHigh', 7, 0.4],
  ],
  soft: [
    ['drumLow', 0, 0.7],
    ['drumHigh', 3, 0.4],
    ['drumLow', 5, 0.45],
  ],
};
/** Last bar of a section: a small roll on the high drum into the next one. */
const FILL: readonly DrumHit[] = [
  ['drumLow', 0, 0.8],
  ['drumHigh', 3, 0.45],
  ['drumHigh', 4, 0.4],
  ['drumHigh', 5, 0.5],
  ['drumHigh', 6, 0.6],
  ['drumHigh', 7, 0.7],
];

function drums(style: DrumStyle, last: boolean, barStart: number): NoteEvent[] {
  const shaker: NoteEvent[] = SHAKER.map((velocity, step) => ({
    instrument: 'shaker',
    step: barStart + step,
    length: 1,
    pitch: 0,
    velocity,
  }));
  const hits = (last ? FILL : DRUMS[style]).map(
    ([instrument, at, velocity]): NoteEvent => ({
      instrument,
      step: barStart + at,
      length: 1,
      pitch: 0,
      velocity,
    }),
  );
  return [...shaker, ...hits];
}

function melody(bar: string, barStart: number): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let at = 0;
  for (const token of parseBar(bar)) {
    if (token.pitch !== null) {
      notes.push({
        instrument: 'pan',
        step: barStart + at,
        length: token.length,
        pitch: token.pitch,
        // On-beat notes a little stronger than the swung off-beats.
        velocity: at % 2 ? 0.7 : 0.85,
      });
    }
    at += token.length;
  }
  return notes;
}

// Time ----------------------------------------------------------------------

/** Seconds from the loop start to a step, with swung off-beats. */
export function stepTime(step: number, bpm: number, swing: number): number {
  const beat = Math.floor(step / 2);
  const offbeat = step - beat * 2;
  return (beat + offbeat * swing) * (60 / bpm);
}

export function sectionsInOrder(song: Song): Section[] {
  return song.form.map(name => {
    const section = song.sections.find(s => s.name === name);
    if (!section) {
      throw new Error(`No section ${name}`);
    }
    return section;
  });
}

/** Every note of one pass through the song, timed and sorted. */
export function arrange(song: Song = SONG): Arrangement {
  const events: NoteEvent[] = [];
  let bar = 0;
  for (const section of sectionsInOrder(song)) {
    section.chords.forEach((chords, i) => {
      const start = bar * STEPS_PER_BAR;
      events.push(...melody(section.melody[i], start));
      for (const style of section.comp) {
        events.push(...comp(style, chords, start));
      }
      events.push(...bass(section.bass, chords, start));
      events.push(...drums(section.drums, i === section.chords.length - 1, start));
      bar += 1;
    });
  }
  const totalSteps = bar * STEPS_PER_BAR;
  const time = (step: number) => stepTime(step, song.bpm, song.swing);
  const notes = events
    .map(event => ({
      ...event,
      time: time(event.step),
      duration: time(event.step + event.length) - time(event.step),
    }))
    .sort((a, b) => a.time - b.time);
  return { bars: bar, totalSteps, loopSeconds: time(totalSteps), notes };
}
