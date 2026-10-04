import {
  RANGES,
  SONG,
  STEPS_PER_BAR,
  arrange,
  chordsOfBar,
  midi,
  parseBar,
  parseChord,
  sectionsInOrder,
  stepTime,
  voicing,
  type Section,
} from '../music/song';

const arrangement = arrange();
const section = (name: string) => {
  const found = SONG.sections.find(s => s.name === name);
  if (!found) {
    throw new Error(`no ${name}`);
  }
  return found;
};
const barSteps = (bar: string) =>
  parseBar(bar).reduce((sum, token) => sum + token.length, 0);
const pitches = (bar: string) =>
  parseBar(bar)
    .map(token => token.pitch)
    .filter((pitch): pitch is number => pitch !== null);

/** The notes of one bar (0-based) of the loop. */
const notesOfBar = (bar: number) =>
  arrangement.notes.filter(
    note => Math.floor(note.step / STEPS_PER_BAR) === bar,
  );

/** First bar of each section in the loop. */
function sectionStarts(): Map<Section, number> {
  const starts = new Map<Section, number>();
  let bar = 0;
  for (const s of sectionsInOrder(SONG)) {
    starts.set(s, bar);
    bar += s.chords.length;
  }
  return starts;
}

describe('song data', () => {
  it('reads note names as MIDI numbers', () => {
    expect(midi('C4')).toBe(60);
    expect(midi('A4')).toBe(69);
    expect(midi('Bb4')).toBe(70);
    expect(midi('F#2')).toBe(42);
    expect(() => midi('H2')).toThrow();
  });

  it('is upbeat: 120 to 128 BPM, sixteenths, at most a light swing', () => {
    expect(SONG.bpm).toBeGreaterThanOrEqual(120);
    expect(SONG.bpm).toBeLessThanOrEqual(128);
    expect(STEPS_PER_BAR).toBe(16);
    expect(SONG.swing).toBeGreaterThanOrEqual(0.5);
    expect(SONG.swing).toBeLessThanOrEqual(0.58);
  });

  it('builds like a climb: groove, hook, lift, summit, at least 24 bars', () => {
    expect(SONG.form).toEqual(['Groove', 'Hook', 'Lift', 'Summit']);
    expect(arrangement.bars).toBeGreaterThanOrEqual(24);
    expect(arrangement.bars).toBeLessThanOrEqual(32);
  });

  it('gives every section as many melody (and counter) bars as chord bars', () => {
    for (const s of sectionsInOrder(SONG)) {
      expect(s.melody).toHaveLength(s.chords.length);
      if (s.counter) {
        expect(s.counter).toHaveLength(s.chords.length);
      }
    }
  });

  it('fills every melody and counter bar exactly to the 4/4 meter', () => {
    for (const s of SONG.sections) {
      [...s.melody, ...(s.counter ?? [])].forEach((bar, i) => {
        expect(`${s.name} ${i}: ${barSteps(bar)}`).toBe(
          `${s.name} ${i}: ${STEPS_PER_BAR}`,
        );
      });
    }
  });

  it('splits every chord bar evenly', () => {
    for (const s of SONG.sections) {
      for (const bar of s.chords) {
        const count = bar.trim().split(/\s+/).length;
        expect(STEPS_PER_BAR % count).toBe(0);
        expect(chordsOfBar(bar)).toHaveLength(STEPS_PER_BAR);
      }
    }
  });

  it('keeps the lead out of the intro groove until its run into the hook', () => {
    const groove = section('Groove');
    groove.melody.slice(0, -1).forEach(bar => expect(pitches(bar)).toEqual([]));
    const run = pitches(groove.melody[groove.melody.length - 1]);
    expect(run.length).toBeGreaterThanOrEqual(3);
    expect([...run].sort((a, b) => a - b)).toEqual(run);
  });

  it('ends the lift with a rising run into the summit', () => {
    const lift = section('Lift');
    const run = pitches(lift.melody[lift.melody.length - 1]);
    expect(run.length).toBeGreaterThanOrEqual(6);
    run.slice(1).forEach((pitch, i) => expect(pitch).toBeGreaterThan(run[i]));
  });

  it('makes the summit bigger: a countermelody and a higher hook', () => {
    const hook = section('Hook');
    const summit = section('Summit');
    expect(summit.counter).toBeDefined();
    expect(Math.max(...summit.melody.flatMap(pitches))).toBeGreaterThan(
      Math.max(...hook.melody.flatMap(pitches)),
    );
    // Same hook idea, but most bars differ.
    const same = hook.melody.filter((bar, i) => bar === summit.melody[i]).length;
    expect(same).toBeLessThanOrEqual(2);
  });

  it('drives the groove with a kick on every beat and claps on 2 and 4', () => {
    const starts = sectionStarts();
    const bar = notesOfBar(starts.get(section('Hook'))!);
    const local = (instrument: string) =>
      bar
        .filter(note => note.instrument === instrument)
        .map(note => note.step % STEPS_PER_BAR);
    expect(local('kick')).toEqual(expect.arrayContaining([0, 4, 8, 12]));
    expect(local('clap')).toEqual([4, 12]);
    expect(local('shaker')).toHaveLength(16);
  });

  it('ends every section with a drum fill in its second half', () => {
    const starts = sectionStarts();
    for (const [s, start] of starts) {
      const last = notesOfBar(start + s.chords.length - 1);
      const fill = last.filter(
        note =>
          (note.instrument === 'drumLow' ||
            note.instrument === 'drumHigh' ||
            note.instrument === 'clap') &&
          note.step % STEPS_PER_BAR >= 8,
      );
      expect(`${s.name}: ${fill.length >= 4}`).toBe(`${s.name}: true`);
    }
  });

  it('keeps every note inside its instrument range', () => {
    for (const note of arrangement.notes) {
      const [low, high] = RANGES[note.instrument];
      expect(note.pitch).toBeGreaterThanOrEqual(low);
      expect(note.pitch).toBeLessThanOrEqual(high);
    }
  });

  it('keeps every note inside the loop, with sane lengths and velocities', () => {
    for (const note of arrangement.notes) {
      expect(note.step).toBeGreaterThanOrEqual(0);
      expect(note.step + note.length).toBeLessThanOrEqual(arrangement.totalSteps);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.velocity).toBeGreaterThan(0);
      expect(note.velocity).toBeLessThanOrEqual(1);
      expect(Number.isFinite(note.time)).toBe(true);
    }
  });

  it('has a consistent loop length: bars times the bar length', () => {
    const bar = 4 * (60 / SONG.bpm);
    expect(arrangement.totalSteps).toBe(arrangement.bars * STEPS_PER_BAR);
    expect(arrangement.loopSeconds).toBeCloseTo(arrangement.bars * bar, 9);
    expect(stepTime(arrangement.totalSteps, SONG.bpm, SONG.swing)).toBeCloseTo(
      arrangement.loopSeconds,
      9,
    );
  });

  it('sorts the notes by time and starts on the first beat', () => {
    const times = arrangement.notes.map(n => n.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[0]).toBe(0);
  });

  it('swings only the in-between sixteenths, keeping eighths and beats straight', () => {
    const eighth = 30 / SONG.bpm;
    expect(stepTime(2, SONG.bpm, SONG.swing)).toBeCloseTo(eighth, 9);
    expect(stepTime(4, SONG.bpm, SONG.swing)).toBeCloseTo(eighth * 2, 9);
    expect(stepTime(1, SONG.bpm, SONG.swing)).toBeCloseTo(eighth * SONG.swing, 9);
  });

  it('plays every instrument somewhere in the loop', () => {
    const used = new Set(arrangement.notes.map(n => n.instrument));
    expect([...used].sort()).toEqual(Object.keys(RANGES).sort());
  });

  it('voices chords close together and without the root of four-note chords', () => {
    expect(voicing(parseChord('F'))).toEqual([57, 60, 65]);
    expect(voicing(parseChord('C7'))).toEqual([58, 64, 67]);
    expect(voicing(parseChord('Cadd9'))).toEqual([62, 64, 67]);
    for (const symbol of ['G', 'C', 'Em', 'D', 'Am7', 'Cmaj7', 'Em7']) {
      const notes = voicing(parseChord(symbol));
      expect(Math.max(...notes) - Math.min(...notes)).toBeLessThan(12);
    }
    expect(() => parseChord('Fsus9')).toThrow();
  });
});
