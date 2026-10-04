import {
  RANGES,
  SONG,
  STEPS_PER_BAR,
  arrange,
  chordsOfBar,
  midi,
  parseBar,
  sectionsInOrder,
  stepTime,
  voicing,
  parseChord,
} from '../music/song';

const arrangement = arrange();

describe('song data', () => {
  it('reads note names as MIDI numbers', () => {
    expect(midi('C4')).toBe(60);
    expect(midi('A4')).toBe(69);
    expect(midi('Bb4')).toBe(70);
    expect(midi('F#2')).toBe(42);
    expect(() => midi('H2')).toThrow();
  });

  it('has an A and a B section, 24 to 32 bars in all', () => {
    const names = SONG.sections.map(s => s.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B']));
    expect(arrangement.bars).toBeGreaterThanOrEqual(24);
    expect(arrangement.bars).toBeLessThanOrEqual(32);
    expect(SONG.bpm).toBeGreaterThanOrEqual(92);
    expect(SONG.bpm).toBeLessThanOrEqual(104);
  });

  it('gives every section as many melody bars as chord bars', () => {
    for (const section of sectionsInOrder(SONG)) {
      expect(section.melody).toHaveLength(section.chords.length);
    }
  });

  it('fills every melody bar exactly to the 4/4 meter', () => {
    for (const section of SONG.sections) {
      section.melody.forEach((bar, i) => {
        const steps = parseBar(bar).reduce((sum, t) => sum + t.length, 0);
        expect(`${section.name} bar ${i + 1}: ${steps}`).toBe(
          `${section.name} bar ${i + 1}: ${STEPS_PER_BAR}`,
        );
      });
    }
  });

  it('splits every chord bar evenly', () => {
    for (const section of SONG.sections) {
      for (const bar of section.chords) {
        const count = bar.trim().split(/\s+/).length;
        expect(STEPS_PER_BAR % count).toBe(0);
        expect(chordsOfBar(bar)).toHaveLength(STEPS_PER_BAR);
      }
    }
  });

  it('varies the melody, so no section repeats another one bar for bar', () => {
    const melodies = SONG.sections.map(s => s.melody.join('|'));
    expect(new Set(melodies).size).toBe(melodies.length);
    // The two A sections share an opening but differ in most bars.
    const a = SONG.sections.find(s => s.name === 'A')!.melody;
    const a2 = SONG.sections.find(s => s.name === 'A2')!.melody;
    const same = a.filter((bar, i) => bar === a2[i]).length;
    expect(same).toBeLessThanOrEqual(2);
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

  it('swings the off-beats late but keeps the beats straight', () => {
    const beat = 60 / SONG.bpm;
    expect(stepTime(2, SONG.bpm, SONG.swing)).toBeCloseTo(beat, 9);
    expect(stepTime(1, SONG.bpm, SONG.swing)).toBeCloseTo(beat * SONG.swing, 9);
    expect(SONG.swing).toBeGreaterThan(0.5);
  });

  it('plays every instrument somewhere in the loop', () => {
    const used = new Set(arrangement.notes.map(n => n.instrument));
    expect([...used].sort()).toEqual(Object.keys(RANGES).sort());
  });

  it('voices chords close together and without the root of seventh chords', () => {
    expect(voicing(parseChord('F'))).toEqual([57, 60, 65]);
    expect(voicing(parseChord('C7'))).toEqual([58, 64, 67]);
    for (const symbol of ['F', 'Bb', 'Dm', 'Gm7', 'Am7', 'C7']) {
      const notes = voicing(parseChord(symbol));
      expect(Math.max(...notes) - Math.min(...notes)).toBeLessThan(12);
    }
    expect(() => parseChord('Fsus9')).toThrow();
  });
});
