import {
  GRIP_X,
  GUIDE_HEIGHT,
  HOP_FRAMES,
  guideMonkeyRows,
  guideStrip,
  hopPoint,
  perchLayout,
} from '../components/MonkeyGuide';
import { SCENE_COLORS } from '../pixel/scene';

const SPRITE_W = 32;
const SPRITE_H = 25;
/** Columns of the sprite that have pixels: the waving hand to the fist. */
const SPRITE_LEFT = 2;
const SPRITE_RIGHT = 27;

const pixelsWith = (rows: readonly string[], keys: string) =>
  [...rows.join('')].filter(k => keys.includes(k)).length;

describe('guideMonkeyRows', () => {
  it.each(['idle', 'blink', 'cheer'] as const)(
    'drops the climbing hold from the %s sprite but keeps the fist',
    pose => {
      const rows = guideMonkeyRows(pose);
      expect(rows).toHaveLength(SPRITE_H);
      expect(rows.every(row => row.length === SPRITE_W)).toBe(true);
      // Hold green, its shine and the chalk dust are all gone.
      expect(pixelsWith(rows, 'GgHC')).toBe(0);
      // The fist starts the sprite, right where the vine runs.
      expect(rows[0].slice(GRIP_X - 2, GRIP_X + 4)).toBe('OOOOOO');
      expect(rows[1][GRIP_X]).not.toBe('.');
    },
  );

  it('keeps every pixel between the waving hand and the fist', () => {
    const rows = guideMonkeyRows('idle');
    const used = rows.flatMap(row =>
      [...row].flatMap((k, x) => (k === '.' ? [] : [x])),
    );
    expect(Math.min(...used)).toBe(SPRITE_LEFT);
    expect(Math.max(...used)).toBe(SPRITE_RIGHT);
  });
});

describe('perchLayout', () => {
  it.each([
    [7, 5, 114],
    [7, 105, 254],
    [3, 0, 60],
  ])('spreads %i perches inside columns %i to %i', (count, left, right) => {
    const perches = perchLayout(count, left, right);
    expect(perches).toHaveLength(count);
    perches.forEach((p, i) => {
      expect(Number.isInteger(p.x)).toBe(true);
      // The whole monkey fits between the edges.
      expect(p.x - GRIP_X + SPRITE_LEFT).toBeGreaterThanOrEqual(left);
      expect(p.x - GRIP_X + SPRITE_RIGHT).toBeLessThanOrEqual(right);
      // Feet dangle above the ground and the head stays in the strip.
      expect(p.y).toBeGreaterThanOrEqual(5);
      expect(p.y + SPRITE_H).toBeLessThan(GUIDE_HEIGHT - 6);
      if (i > 0) {
        expect(p.x).toBeGreaterThan(perches[i - 1].x);
      }
    });
  });
});

describe('hopPoint', () => {
  const from = { x: 30, y: 10 };
  const to = { x: 90, y: 12 };

  it('starts on one perch and lands on the other', () => {
    expect(hopPoint(from, to, 0)).toEqual(from);
    expect(hopPoint(from, to, HOP_FRAMES)).toEqual(to);
    expect(hopPoint(from, to, HOP_FRAMES + 5)).toEqual(to);
  });

  it('moves in whole pixels, rising above both perches and staying in the strip', () => {
    const path = Array.from({ length: HOP_FRAMES + 1 }, (_, f) =>
      hopPoint(from, to, f),
    );
    path.forEach(p => {
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
      expect(p.y).toBeGreaterThanOrEqual(0);
    });
    const top = Math.min(...path.map(p => p.y));
    expect(top).toBeLessThan(Math.min(from.y, to.y) - 4);
    // x only ever moves towards the new perch.
    path.slice(1).forEach((p, i) => expect(p.x).toBeGreaterThanOrEqual(path[i].x));
  });

  it('never leaves the top of the strip, even from a high perch', () => {
    const path = Array.from({ length: HOP_FRAMES + 1 }, (_, f) =>
      hopPoint({ x: 0, y: 2 }, { x: 200, y: 3 }, f),
    );
    expect(Math.min(...path.map(p => p.y))).toBeGreaterThanOrEqual(0);
  });
});

describe('guideStrip', () => {
  const perches = perchLayout(7, 5, 114);

  it.each([false, true])('covers every pixel with palette colours (night: %s)', night => {
    const rows = guideStrip(120, GUIDE_HEIGHT, night, perches);
    const palette: Readonly<Record<string, string>> = night
      ? SCENE_COLORS.night
      : SCENE_COLORS.day;
    expect(rows).toHaveLength(GUIDE_HEIGHT);
    expect(rows.every(row => row.length === 120)).toBe(true);
    expect(pixelsWith(rows, '.')).toBe(0);
    const keys = [...new Set(rows.join(''))];
    expect(keys.filter(k => !(k in palette))).toEqual([]);
  });

  it('is the same picture every time', () => {
    expect(guideStrip(130, GUIDE_HEIGHT, true, perches)).toEqual(
      guideStrip(130, GUIDE_HEIGHT, true, perches),
    );
  });

  it('hangs a vine down to every perch, two pixels wide', () => {
    const rows = guideStrip(120, GUIDE_HEIGHT, false, perches);
    perches.forEach(p => {
      expect(rows[p.y][p.x]).toBe('v');
      expect(rows[p.y][p.x + 1]).toBe('v');
      expect(rows[p.y - 1][p.x]).toBe('v');
    });
  });
});
