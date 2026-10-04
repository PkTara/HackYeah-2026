/**
 * The background music, as plain data: an original, groovy island loop
 * written for Climbing Monkey. Nothing here touches audio; arrange() turns
 * the song into a flat, timed list of notes that the Web Audio engine
 * (webMusic.ts) plays and the tests check.
 *
 * Time is counted in steps of one sixteenth note, 16 per 4/4 bar. Every
 * second sixteenth is played late, which gives the swing.
 *
 * The energy comes from the rhythm section: a syncopated kick, a bass that
 * sits in the pocket with ghost notes and octave pops, and off-beat marimba
 * chops. The steel drum plays a short, repeated riff in the middle register.
 * The form still builds: a groove, the hook, a half-time lift, and a summit
 * that is bigger by fullness (warm keys chords, more percussion, a low
 * answer phrase), never by going higher. Its last bar runs back into the
 * groove, so the loop never stops.
 *
 * It lives in platform next to its only player, not in core: core is the
 * climbing domain, and this is a sound asset written as code.
 */

export const STEPS_PER_BAR = 16;

export type Instrument =
  | 'pan' // steel drum lead
  | 'marimba' // chords
  | 'kalimba' // sparse low arpeggios and answer phrases
  | 'keys' // warm sustained chords in the summit
  | 'bass'
  | 'kick'
  | 'clap'
  | 'shaker' // sixteenths, like a hi-hat
  | 'drumLow' // low conga or tom
  | 'drumHigh'; // high conga

/** Lowest and highest MIDI note each pitched instrument is written for. */
export const RANGES: Readonly<Record<Instrument, readonly [number, number]>> = {
  pan: [62, 86], // D4 to D6
  marimba: [50, 79],
  kalimba: [55, 79],
  keys: [50, 79],
  bass: [28, 60],
  kick: [0, 0],
  clap: [0, 0],
  shaker: [0, 0],
  drumLow: [0, 0],
  drumHigh: [0, 0],
};

/** Highest note any melodic voice plays: D6. Nothing piercing above it. */
export const CEILING = 86;

/** How the marimba, kalimba or keys accompany a section. */
export type CompStyle = 'funk' | 'arp' | 'pads' | 'keys';
export type BassStyle = 'pulse' | 'pocket' | 'half';
export type DrumStyle = 'intro' | 'pocket' | 'lift' | 'full';
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
  /** Optional low answer phrases on the kalimba, written the same way. */
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
  title: 'Jungle Pocket',
  bpm: 122,
  swing: 0.58,
  key: 'G major',
  form: ['Groove', 'Hook', 'Lift', 'Summit'],
  sections: [
    {
      // Drums, bass and chops only; three notes lead into the hook.
      name: 'Groove',
      chords: ['G', 'C', 'G', 'D'],
      melody: ['-:16', '-:16', '-:16', '-:10 D5:2 E5:2 F#5:2'],
      comp: ['funk'],
      bass: 'pulse',
      drums: 'intro',
      fill: 'toms',
    },
    {
      // One short riff, repeated, answered a step up on C and D.
      name: 'Hook',
      chords: ['G', 'C', 'G', 'D', 'G', 'C', 'Am', 'D'],
      melody: [
        '-:2 B4:1 -:1 D5:2 B4:2 -:2 A4:1 B4:1 -:2 G4:2',
        '-:2 C5:1 -:1 E5:2 C5:2 -:2 B4:1 C5:1 -:4',
        '-:2 B4:1 -:1 D5:2 B4:2 -:2 A4:1 B4:1 -:2 G4:2',
        '-:2 A4:1 -:1 D5:2 F#5:2 -:2 E5:1 D5:1 -:4',
        '-:2 B4:1 -:1 D5:2 B4:2 -:2 A4:1 B4:1 -:2 G4:2',
        '-:2 C5:1 -:1 E5:2 C5:2 -:2 B4:1 C5:1 -:4',
        '-:2 C5:1 -:1 E5:2 A5:2 -:2 G5:1 E5:1 -:4',
        '-:2 D5:2 D5:2 -:2 D5:1 E5:1 -:2 F#5:2 -:2',
      ],
      comp: ['funk'],
      bass: 'pocket',
      drums: 'pocket',
      fill: 'toms',
    },
    {
      // Half time: the lead calls, the bar answers; repeated notes build.
      name: 'Lift',
      chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D'],
      melody: [
        'B4:3 -:1 B4:2 G4:2 -:8',
        '-:8 C5:3 -:1 C5:2 E5:2',
        'D5:3 -:1 D5:2 B4:2 -:8',
        '-:8 A4:3 -:1 A4:2 D5:2',
        'E5:3 -:1 E5:2 B4:2 -:8',
        '-:8 E5:3 -:1 E5:2 G5:2',
        'A5:3 -:1 G5:2 E5:2 -:4 C5:2 E5:2',
        'D5:2 -:2 D5:2 -:2 D5:1 D5:1 E5:2 F#5:2 -:2',
      ],
      comp: ['arp', 'pads'],
      bass: 'half',
      drums: 'lift',
      fill: 'build',
    },
    {
      // The same riff over fuller seventh chords, more percussion and a
      // low kalimba answer: bigger, not higher.
      name: 'Summit',
      chords: ['Gmaj7', 'Cmaj7', 'Gmaj7', 'D7', 'Em7', 'Cmaj7', 'Am7', 'D7'],
      melody: [
        '-:2 B4:1 -:1 D5:2 B4:2 -:2 A4:1 B4:1 -:2 G4:2',
        '-:2 C5:1 -:1 E5:2 C5:2 -:2 B4:1 C5:1 -:4',
        '-:2 B4:1 -:1 D5:2 B4:2 -:2 A4:1 B4:1 -:2 G4:2',
        '-:2 A4:1 -:1 D5:2 F#5:2 -:2 A5:1 F#5:1 -:4',
        '-:2 B4:1 -:1 D5:2 B4:2 -:2 A4:1 B4:1 -:2 G4:2',
        '-:2 C5:1 -:1 E5:2 C5:2 -:2 B4:1 C5:1 -:4',
        '-:2 C5:1 -:1 E5:2 A5:2 -:2 B5:1 A5:1 -:4',
        '-:2 D5:2 D5:2 -:2 D5:1 E5:1 -:2 F#5:2 -:2',
      ],
      counter: [
        '-:16',
        '-:12 G4:1 A4:1 B4:2',
        '-:16',
        '-:12 F#4:1 G4:1 A4:2',
        '-:16',
        '-:12 G4:1 A4:1 B4:2',
        '-:16',
        '-:16',
      ],
      comp: ['funk', 'keys'],
      bass: 'pocket',
      drums: 'full',
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

/**
 * Every chord tone, root included, between G3 and F#4: the warm, full
 * voicing the keys hold under the summit.
 */
export function keysVoicing(chord: Chord): number[] {
  return chord.intervals
    .map(interval => {
      const pc = (chord.root + interval) % 12;
      let note = 48 + pc;
      while (note < 55) {
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

/**
 * Funky marimba chops on the off-beats, with quiet ghost chops a sixteenth
 * later. Nothing on the beat: that belongs to the kick and the bass.
 */
const FUNK = hits([
  [2, 1, 0.7],
  [3, 1, 0.3],
  [6, 1, 0.6],
  [10, 1, 0.7],
  [11, 1, 0.3],
  [14, 1, 0.55],
]);
const PADS = hits([
  [0, 8, 0.5],
  [8, 8, 0.45],
]);
/** Keys: a long chord on beat 1 and a push on the "and" of beat 3. */
const KEYS = hits([
  [0, 10, 0.6],
  [10, 6, 0.45],
]);
/** Sparse kalimba on the off-beat eighths, in the marimba's own register. */
const ARP_STEPS = [2, 6, 10, 14];
const ARP_ORDER = [0, 1, 2, 1];

function comp(style: CompStyle, bar: string, barStart: number): NoteEvent[] {
  const chords = chordsOfBar(bar);
  if (style === 'arp') {
    return ARP_STEPS.map((step, i) => ({
      instrument: 'kalimba' as const,
      step: barStart + step,
      length: 2,
      pitch: voicing(chords[step])[ARP_ORDER[i]],
      velocity: 0.5,
    }));
  }
  if (style === 'keys') {
    return KEYS.flatMap(hit =>
      keysVoicing(chords[hit.at]).map(pitch => ({
        instrument: 'keys' as const,
        step: barStart + hit.at,
        length: hit.length,
        pitch,
        velocity: hit.velocity,
      })),
    );
  }
  const pattern = style === 'funk' ? FUNK : PADS;
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
 * for a chord that lasts a whole bar (16) or half a bar (8). Roots land with
 * the kick; quiet ghost notes and octave pops fill the pocket in between.
 */
const BASS: Readonly<
  Record<BassStyle, Readonly<Record<number, readonly (readonly number[])[]>>>
> = {
  pulse: {
    16: [
      [0, 0, 3, 0.95],
      [7, 0, 1, 0.7],
      [8, 0, 2, 0.85],
      [10, 7, 2, 0.7],
      [14, 12, 1, 0.55],
    ],
    8: [
      [0, 0, 3, 0.95],
      [6, 7, 2, 0.7],
    ],
  },
  pocket: {
    16: [
      [0, 0, 3, 1],
      [3, 0, 1, 0.3], // ghost
      [5, 12, 1, 0.65], // octave pop
      [7, 0, 1, 0.8],
      [8, 0, 2, 0.9],
      [10, 7, 2, 0.75],
      [13, 0, 1, 0.3], // ghost
      [14, 12, 1, 0.6], // octave pop
      [15, 7, 1, 0.5],
    ],
    8: [
      [0, 0, 3, 1],
      [3, 0, 1, 0.3],
      [5, 12, 1, 0.6],
      [6, 7, 2, 0.75],
    ],
  },
  half: {
    16: [
      [0, 0, 6, 0.9],
      [7, 0, 1, 0.5],
      [8, 7, 4, 0.75],
      [14, 12, 2, 0.55],
    ],
    8: [
      [0, 0, 5, 0.9],
      [6, 7, 2, 0.6],
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

/** [instrument, step, velocity] for every step listed. */
const at = (
  instrument: Instrument,
  steps: readonly number[],
  velocity: number,
): DrumHit[] => steps.map(step => [instrument, step, velocity] as const);

/** Sixteenth shaker with accents on the beat; `eighths` drops the in-betweens. */
function shaker(level: number, eighths = false): DrumHit[] {
  const accents = [1, 0.4, 0.7, 0.45];
  return Array.from({ length: STEPS_PER_BAR }, (_, step) => step)
    .filter(step => !eighths || step % 2 === 0)
    .map(step => ['shaker', step, level * accents[step % 4]] as const);
}

const DRUMS: Readonly<Record<DrumStyle, readonly DrumHit[]>> = {
  intro: [
    ...at('kick', [0, 8], 0.9),
    ...at('kick', [10], 0.6),
    ...at('clap', [4, 12], 0.55),
    ...shaker(0.55, true),
    ...at('drumHigh', [3, 11], 0.35),
  ],
  // Kick on 1 and 3 with a push into 3 and after it; claps on 2 and 4
  // with a ghost before the next bar.
  pocket: [
    ...at('kick', [0, 8], 0.95),
    ...at('kick', [7, 10], 0.55),
    ...at('clap', [4, 12], 0.7),
    ...at('clap', [15], 0.22),
    ...shaker(0.6),
    ...at('drumHigh', [3, 11], 0.35),
    ...at('drumLow', [6, 14], 0.4),
  ],
  // Half time: the clap moves to beat 3 and the kick thins out.
  lift: [
    ...at('kick', [0, 10], 0.8),
    ...at('clap', [8], 0.6),
    ...shaker(0.45),
    ...at('drumLow', [3, 11], 0.4),
    ...at('drumHigh', [6, 14], 0.35),
  ],
  // The pocket with more of everything: an extra kick push and congas.
  full: [
    ...at('kick', [0, 8], 0.95),
    ...at('kick', [3, 7, 10], 0.5),
    ...at('clap', [4, 12], 0.72),
    ...at('clap', [15], 0.25),
    ...shaker(0.65),
    ...at('drumHigh', [3, 9, 11], 0.38),
    ...at('drumLow', [6, 14], 0.45),
  ],
};

const FILLS: Readonly<Record<FillStyle, readonly DrumHit[]>> = {
  // Beats 1 and 2 as usual, then congas and toms rolling down.
  toms: [
    ...at('kick', [0, 8], 0.9),
    ...at('clap', [4], 0.7),
    ...shaker(0.55).filter(([, step]) => step < 8),
    ['drumHigh', 8, 0.4],
    ['drumHigh', 10, 0.45],
    ['drumHigh', 11, 0.4],
    ['drumLow', 12, 0.55],
    ['drumLow', 13, 0.6],
    ['drumLow', 14, 0.7],
    ['drumLow', 15, 0.75],
  ],
  // Four on the floor and a clap roll that gets louder into the summit.
  build: [
    ...at('kick', [0, 4, 8, 12], 0.85),
    ...shaker(0.55),
    ...[4, 8, 10, 12, 13, 14, 15].map(
      (step, i): DrumHit => ['clap', step, 0.3 + i * 0.06],
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
        velocity: level * (step % 4 === 0 ? 1 : step % 2 === 0 ? 0.9 : 0.8),
      });
    }
    step += token.length;
  }
  return notes;
}

/**
 * Small, fixed velocity changes so repeated hits don't sound like a
 * machine. Picked from the step and the instrument, so every render and
 * every pass of the loop is the same.
 */
const NUDGES = [0, -0.05, 0.03, -0.03, 0.05, -0.06, 0.02];
const INSTRUMENT_ORDER = Object.keys(RANGES);

export function humanise(note: NoteEvent): NoteEvent {
  const salt = INSTRUMENT_ORDER.indexOf(note.instrument) * 5;
  const nudge = NUDGES[(note.step * 3 + salt) % NUDGES.length];
  return {
    ...note,
    velocity: Math.min(1, Math.max(0.05, note.velocity * (1 + nudge))),
  };
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
      events.push(...line('pan', section.melody[i], start, 0.9));
      if (section.counter) {
        events.push(...line('kalimba', section.counter[i], start, 0.6));
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
    .map(humanise)
    .map(event => ({
      ...event,
      time: time(event.step),
      duration: time(event.step + event.length) - time(event.step),
    }))
    .sort((a, b) => a.time - b.time);
  return { bars: bar, totalSteps, loopSeconds: time(totalSteps), notes };
}
