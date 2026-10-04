import { GLYPH_HEIGHT, textRows, textWidth } from '../pixel/font';
import { art } from '../pixel/raster';

/** Every character the font has a glyph for. */
const SUPPORTED = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?:'-+/%()&=><*°";

describe('textRows', () => {
  it('draws a line of text as 7 rows of ink with one empty column between letters', () => {
    expect(textRows('HI')).toEqual(
      art(`
        #...#.###
        #...#..#.
        #...#..#.
        #####..#.
        #...#..#.
        #...#..#.
        #...#.###
      `),
    );
  });

  it('gives every supported character its own rectangular glyph of ink and gaps', () => {
    const problems: string[] = [];
    const seen = new Map<string, string>();
    for (const ch of SUPPORTED) {
      const rows = textRows(ch);
      const widths = new Set(rows.map(row => row.length));
      if (rows.length !== GLYPH_HEIGHT || widths.size !== 1) {
        problems.push(`${ch}: rows are not ${GLYPH_HEIGHT} of equal width`);
      }
      if (/[^.#]/.test(rows.join(''))) {
        problems.push(`${ch}: uses keys other than '#' and '.'`);
      }
      const bitmap = rows.join('\n');
      const twin = seen.get(bitmap);
      if (twin !== undefined) {
        problems.push(`${ch}: looks the same as ${twin}`);
      }
      seen.set(bitmap, ch);
    }
    expect(problems).toEqual([]);
    expect(GLYPH_HEIGHT).toBe(7);
  });

  it('draws lowercase letters as uppercase', () => {
    expect(textRows('climbing monkey')).toEqual(textRows('CLIMBING MONKEY'));
    expect(textRows('Level 2')).toEqual(textRows('LEVEL 2'));
  });

  it("falls back to '?' for characters the font does not have", () => {
    const question = textRows('?');
    // '#' and '_' are not glyphs, nor are Polish letters or an emoji.
    for (const ch of ['@', '#', '_', '~', 'ą', 'Ż', '\u{1F600}']) {
      expect(textRows(ch)).toEqual(question);
    }
    expect(textRows('a@b')).toEqual(textRows('A?B'));
  });

  it('stacks lines with a 3-row gap and pads shorter lines to the widest', () => {
    const rows = textRows('AB\nC');
    const width = textWidth('AB');
    expect(rows).toHaveLength(GLYPH_HEIGHT + 3 + GLYPH_HEIGHT);
    expect(rows.every(row => row.length === width)).toBe(true);
    expect(rows.slice(0, GLYPH_HEIGHT)).toEqual(textRows('AB'));
    expect(rows.slice(GLYPH_HEIGHT, GLYPH_HEIGHT + 3)).toEqual(
      new Array(3).fill('.'.repeat(width)),
    );
    expect(rows.slice(GLYPH_HEIGHT + 3)).toEqual(
      textRows('C').map(row => row.padEnd(width, '.')),
    );
  });

  it('pads to the widest line even when it is not the first', () => {
    const rows = textRows('I\nWIDE');
    expect(new Set(rows.map(row => row.length))).toEqual(
      new Set([textWidth('WIDE')]),
    );
  });

  it('draws the empty string with no width', () => {
    const rows = textRows('');
    expect(rows).toHaveLength(GLYPH_HEIGHT);
    expect(rows.every(row => row === '')).toBe(true);
  });
});

describe('textWidth', () => {
  it.each(['A', 'HI', 'Level 2', 'Hello, world!', 'I.I', ' ', '100%', 'a@b'])(
    'matches the drawn width of %p',
    text => {
      expect(textWidth(text)).toBe(textRows(text)[0].length);
    },
  );

  it('adds one column between letters and uses narrow glyphs where they exist', () => {
    expect(textWidth('A')).toBe(5);
    expect(textWidth('AA')).toBe(11);
    expect(textWidth('I')).toBe(3);
    expect(textWidth('.')).toBe(1);
  });

  it('is 0 for the empty string', () => {
    expect(textWidth('')).toBe(0);
  });
});
