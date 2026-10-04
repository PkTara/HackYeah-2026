/**
 * The background music, as plain data: an original, upbeat island loop
 * written for Climbing Monkey. Nothing here touches audio; arrange() turns
 * the song into a flat, timed list of notes that the Web Audio engine
 * (webMusic.ts) plays and the tests check.
 *
 * Time is counted in steps of one sixteenth note, 16 per 4/4 bar. Every
 * second sixteenth is played a touch late (a light swing).
 *
 * The shape is a climb: a short drum and bass groove, the steel drum hook,
 * a lighter lift that builds with rising arpeggios and a drum roll, and a
 * bigger summit section with brighter chords and a countermelody. Its last
 * bar runs back into the groove, so the loop never stops.
 *
 * It lives in platform next to its only player, not in core: core is the
 * climbing domain, and this is a sound asset written as code.
 */

export const STEPS_PER_BAR = 16;

export type Instrument =
  | 'pan' // steel drum lead
  | 'marimba' // chords
  | 'kalimba' // arpeggios and the countermelody
  | 'bass'
  | 'kick'
  | 'clap'
  | 'shaker' // sixteenths, like a hi-hat
  | 'drumLow' // low conga or tom
  | 'drumHigh'; // high conga

/** Lowest and highest MIDI note each pitched instrument is written for. */
export const RANGES: Readonly<Record<Instrument, readonly [number, number]>> = {
  pan: [60, 91], // C4 to G6
  marimba: [50, 79],
  kalimba: [60, 96],
  bass: [28, 60],
  kick: [0, 0],
  clap: [0, 0],
  shaker: [0, 0],
  drumLow: [0, 0],
  drumHigh: [0, 0],
};

/** How the marimba or kalimba accompanies a section. */
export type CompStyle = 'calypso' | 'skank' | 'arp' | 'pads';
export type BassStyle = 'pulse' | 'drive' | 'half';
export type DrumStyle = 'intro' | 'groove' | 'lift' | 'big';
/** The last bar of a section: a tom roll, or a clap roll that builds. */
export type FillStyle = 'toms' | 'build';

export type Section = Readonly<{
  name: string;
  /** One entry per bar. Two chords ("Am D") split the bar in half. */
  chords: readonly string[];
  /**
   * Steel drum melody, one entry per bar: "pitch:steps" tokens, with "-"
   * for a rest. Every bar adds up to 16 steps.
   */
  melody: readonly string[];
  /** Optional second line on the kalimba, written the same way. */
  counter?: readonly string[];
  comp: readonly CompStyle[];
  bass: BassStyle;
  drums: DrumStyle;
  fill: FillStyle;
}>;

export type Song = Readonly<{
  title: string;
  bpm: number;
  /** Where the off-beat sixteenth falls inside its eighth (0.5 is straight). */
  swing: number;
  key: string;
  sections: readonly Section[];
  /** Section names in playing order. The end loops back to the start. */
  form: readonly string[];
}>;

export const SONG: Song = {
  title: 'Top Out',
  bpm: 124,
  swing: 0.54,
  key: 'G major',
  form: ['Groove', 'Hook', 'Lift', 'Summit'],
  sections: [
    {
      // Drums, bass and chords only; a run up into the hook at the end.
      name: 'Groove',
      chords: ['G', 'C', 'G', 'D'],
      melody: ['-:16', '-:16', '-:16', '-:8 D5:2 E5:2 F#5:2 A5:2'],
      comp: ['calypso'],
      bass: 'pulse',
      drums: 'intro',
      fill: 'toms',
    },
    {
      // Call and response, each answer a step higher than the call.
      name: 'Hook',
      chords: ['G', 'C', 'Em', 'D', 'G', 'C', 'Am D', 'G'],
      melody: [
        'D5:3 G5:3 B5:2 A5:2 G5:2 D5:4',
        'E5:3 G5:3 C6:2 B5:2 G5:2 E5:4',
        'B4:2 D5:2 E5:2 G5:2 B5:3 A5:3 G5:2',
        'A5:3 F#5:3 D5:4 -:2 D5:1 E5:1 F#5:2',
        'G5:3 B5:3 D6:2 B5:2 G5:2 D5:4',
        'E5:2 G5:2 C6:3 B5:3 A5:2 G5:4',
        'A5:2 C6:2 B5:2 A5:2 F#5:2 A5:2 D6:4',
        'G5:3 D5:3 G5:2 -:8',
      ],
      comp: ['calypso'],
      bass: 'drive',
      drums: 'groove',
      fill: 'toms',
    },
    {
      // Half-time breather that climbs: arpeggios up, then a run and a roll.
      name: 'Lift',
      chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D'],
      melody: [
        'B5:6 G5:2 E5:4 -:4',
        '-:4 E5:2 G5:2 C6:6 -:2',
        'D6:6 B5:2 G5:4 -:4',
        '-:4 F#5:2 A5:2 D6:6 -:2',
        'E5:2 G5:2 B5:2 E5:2 G5:2 B5:2 E6:4',
        'C5:2 E5:2 G5:2 C5:2 E5:2 G5:2 C6:4',
        'A4:2 C5:2 E5:2 A5:2 C6:2 E6:2 A5:4',
        'D5:1 E5:1 F#5:1 G5:1 A5:1 B5:1 C6:1 D6:1 -:8',
      ],
      comp: ['arp', 'pads'],
      bass: 'half',
      drums: 'lift',
      fill: 'build',
    },
    {
      // The hook again, higher, with brighter chords and a second line.
      name: 'Summit',
      chords: ['G', 'Cmaj7', 'Em7', 'D', 'G', 'Cadd9', 'Am7 D', 'G'],
      melody: [
        'D5:3 G5:3 B5:2 A5:2 G5:2 B5:2 D6:2',
        'E5:3 G5:3 C6:2 B5:2 G5:2 E6:4',
        'B4:2 D5:2 E5:2 G5:2 B5:3 D6:3 E6:2',
        'F#6:3 E6:3 D6:4 -:2 D5:1 E5:1 F#5:2',
        'G5:3 B5:3 D6:2 G6:2 D6:2 B5:4',
        'E5:2 G5:2 C6:3 D6:3 E6:2 G6:4',
        'A5:2 C6:2 E6:2 C6:2 D6:2 F#6:2 A5:4',
        'G6:3 D6:3 B5:2 G5:2 D5:1 G5:1 B5:1 D6:1 -:2',
      ],
      counter: [
        'B4:4 D5:4 G5:4 D5:4',
        'C5:4 E5:4 G5:4 E5:4',
        'B4:4 E5:4 G5:4 E5:4',
        'A4:4 D5:4 F#5:4 A5:4',
        'B4:4 D5:4 G5:4 B5:4',
        'C5:4 E5:4 G5:4 D5:4',
        'C5:4 E5:4 D5:4 F#5:4',
        'G5:4 D5:4 B4:4 G4:4',
      ],
      comp: ['calypso', 'skank'],
      bass: 'drive',
      drums: 'big',
      fill: 'toms',
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
  add9: [0, 4, 7, 14],
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
  const tones =
    chord.intervals.length > 3 ? chord.intervals.slice(1) : chord.intervals;
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

/** Where each chord of a bar starts and how many steps it lasts. */
export function chordSpans(bar: string) {
  const symbols = bar.trim().split(/\s+/);
  const span = STEPS_PER_BAR / symbols.length;
  return symbols.map((symbol, i) => ({
    chord: parseChord(symbol),
    start: i * span,
    length: span,
  }));
}

/** The chord sounding at each step of a bar. */
export function chordsOfBar(bar: string): Chord[] {
  const spans = chordSpans(bar);
  return Array.from(
    { length: STEPS_PER_BAR },
    (_, step) => spans[Math.floor(step / spans[0].length)].chord,
  );
}

// Patterns ------------------------------------------------------------------

type Hit = Readonly<{ at: number; length: number; velocity: number }>;
const hits = (list: readonly (readonly number[])[]): Hit[] =>
  list.map(([at, length, velocity]) => ({ at, length, velocity }));

/** Marimba stabs in the 3 + 3 + 2 calypso rhythm, twice a bar. */
const CALYPSO = hits([
  [0, 3, 0.8],
  [3, 3, 0.55],
  [6, 2, 0.65],
  [8, 3, 0.75],
  [11, 3, 0.55],
  [14, 2, 0.65],
]);
/** Short off-beat chops in the gaps of the calypso stabs. */
const SKANK = hits([
  [2, 1, 0.4],
  [10, 1, 0.4],
]);
const PADS = hits([
  [0, 8, 0.5],
  [8, 8, 0.45],
]);
/** Kalimba eighths up and down the chord, an octave above the marimba. */
const ARP_ORDER = [0, 1, 2, 3, 2, 1, 2, 3];

function comp(style: CompStyle, bar: string, barStart: number): NoteEvent[] {
  const chords = chordsOfBar(bar);
  if (style === 'arp') {
    return ARP_ORDER.map((index, i) => {
      const step = i * 2;
      const voiced = voicing(chords[step]);
      const tones = [...voiced, voiced[0] + 12];
      return {
        instrument: 'kalimba' as const,
        step: barStart + step,
        length: 2,
        pitch: tones[index] + 12,
        velocity: i % 2 ? 0.4 : 0.5,
      };
    });
  }
  const pattern =
    style === 'calypso' ? CALYPSO : style === 'skank' ? SKANK : PADS;
  return pattern.flatMap(hit =>
    voicing(chords[hit.at]).map(pitch => ({
      instrument: 'marimba' as const,
      step: barStart + hit.at,
      length: hit.length,
      pitch,
      velocity: hit.velocity,
    })),
  );
}

/**
 * Bass notes as [step in chord, interval above the root, length, velocity],
 * for a chord that lasts a whole bar (16) or half a bar (8). The roots land
 * with the kick; octave jumps fill the gaps in between.
 */
const BASS: Readonly<
  Record<BassStyle, Readonly<Record<number, readonly (readonly number[])[]>>>
> = {
  pulse: {
    16: [
      [0, 0, 3, 0.95],
      [3, 0, 1, 0.6],
      [6, 0, 2, 0.75],
      [8, 0, 3, 0.9],
      [11, 0, 1, 0.6],
      [14, 7, 2, 0.75],
    ],
    8: [
      [0, 0, 3, 0.95],
      [3, 0, 1, 0.6],
      [6, 7, 2, 0.75],
    ],
  },
  drive: {
    16: [
      [0, 0, 2, 0.95],
      [3, 12, 1, 0.65],
      [4, 0, 2, 0.8],
      [7, 7, 1, 0.65],
      [8, 0, 2, 0.9],
      [11, 12, 1, 0.65],
      [12, 7, 2, 0.8],
      [14, 12, 2, 0.7],
    ],
    8: [
      [0, 0, 2, 0.95],
      [3, 12, 1, 0.65],
      [4, 0, 2, 0.8],
      [6, 7, 2, 0.7],
    ],
  },
  half: {
    16: [
      [0, 0, 6, 0.9],
      [6, 0, 2, 0.6],
      [8, 7, 6, 0.8],
      [14, 12, 2, 0.65],
    ],
    8: [
      [0, 0, 6, 0.9],
      [6, 7, 2, 0.65],
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

type DrumHit = readonly [Instrument, number, number];

/** [instrument, steps, velocity] for every step listed. */
const at = (
  instrument: Instrument,
  steps: readonly number[],
  velocity: number,
): DrumHit[] => steps.map(step => [instrument, step, velocity] as const);

/** Sixteenth shaker with accents on the beat; `eighths` drops the in-betweens. */
function shaker(level: number, eighths = false): DrumHit[] {
  const accents = [1, 0.45, 0.75, 0.5];
  return Array.from({ length: STEPS_PER_BAR }, (_, step) => step)
    .filter(step => !eighths || step % 2 === 0)
    .map(step => ['shaker', step, level * accents[step % 4]] as const);
}

const FOUR = [0, 4, 8, 12];

const DRUMS: Readonly<Record<DrumStyle, readonly DrumHit[]>> = {
  intro: [
    ...at('kick', FOUR, 0.85),
    ...at('clap', [12], 0.55),
    ...shaker(0.6, true),
    ...at('drumHigh', [3, 11], 0.4),
  ],
  groove: [
    ...at('kick', FOUR, 0.9),
    ...at('clap', [4, 12], 0.7),
    ...shaker(0.65),
    ...at('drumHigh', [3, 10, 14], 0.45),
    ...at('drumLow', [6], 0.5),
  ],
  // Half time: the clap moves to beat 3 and the kick thins out.
  lift: [
    ...at('kick', [0, 10], 0.8),
    ...at('clap', [8], 0.6),
    ...shaker(0.5),
    ...at('drumLow', [3, 11], 0.45),
    ...at('drumHigh', [6, 14], 0.4),
  ],
  big: [
    ...at('kick', FOUR, 0.95),
    ...at('kick', [10], 0.5),
    ...at('clap', [4, 12], 0.75),
    ...at('clap', [15], 0.3),
    ...shaker(0.7),
    ...at('drumHigh', [3, 6, 10, 13], 0.45),
    ...at('drumLow', [7, 14], 0.5),
  ],
};

const FILLS: Readonly<Record<FillStyle, readonly DrumHit[]>> = {
  // Beats 1 and 2 as usual, then congas and toms rolling down.
  toms: [
    ...at('kick', [0, 4, 8], 0.9),
    ...at('clap', [4], 0.7),
    ...shaker(0.6).filter(([, step]) => step < 8),
    ['drumHigh', 8, 0.45],
    ['drumHigh', 9, 0.4],
    ['drumHigh', 10, 0.5],
    ['drumHigh', 11, 0.45],
    ['drumLow', 12, 0.6],
    ['drumLow', 13, 0.65],
    ['drumLow', 14, 0.75],
    ['drumLow', 15, 0.8],
  ],
  // Four on the floor and a clap roll that gets louder into the summit.
  build: [
    ...at('kick', FOUR, 0.85),
    ...shaker(0.6),
    ...[4, 8, 10, 12, 13, 14, 15].map(
      (step, i): DrumHit => ['clap', step, 0.35 + i * 0.07],
    ),
  ],
};

function drums(
  style: DrumStyle,
  fill: FillStyle | null,
  barStart: number,
): NoteEvent[] {
  return (fill ? FILLS[fill] : DRUMS[style]).map(
    ([instrument, step, velocity]): NoteEvent => ({
      instrument,
      step: barStart + step,
      length: 1,
      pitch: 0,
      velocity,
    }),
  );
}

function line(
  instrument: Instrument,
  bar: string,
  barStart: number,
  level: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let step = 0;
  for (const token of parseBar(bar)) {
    if (token.pitch !== null) {
      notes.push({
        instrument,
        step: barStart + step,
        length: token.length,
        pitch: token.pitch,
        // Notes on the beat a little stronger than the ones in between.
        velocity: level * (step % 4 === 0 ? 1 : step % 2 === 0 ? 0.88 : 0.78),
      });
    }
    step += token.length;
  }
  return notes;
}

// Time ----------------------------------------------------------------------

/** Seconds from the loop start to a step, with the swung sixteenths. */
export function stepTime(step: number, bpm: number, swing: number): number {
  const eighth = Math.floor(step / 2);
  const offbeat = step - eighth * 2;
  return (eighth + offbeat * swing) * (30 / bpm);
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
      const last = i === section.chords.length - 1;
      events.push(...line('pan', section.melody[i], start, 0.95));
      if (section.counter) {
        events.push(...line('kalimba', section.counter[i], start, 0.55));
      }
      for (const style of section.comp) {
        events.push(...comp(style, chords, start));
      }
      events.push(...bass(section.bass, chords, start));
      events.push(...drums(section.drums, last ? section.fill : null, start));
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
