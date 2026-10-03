import { jungleScene, SCENE_COLORS } from '../pixel/scene';

/** JungleHero's height in art pixels. */
const HERO_HEIGHT = 62;
/** Hold rows like the ones JungleHero passes for a five-step level. */
const HOLDS = [31, 25, 18, 12, 6];

const CASES = [60, 90, 120].flatMap(cols =>
  [false, true].map(night => ({
    cols,
    night,
    label: `${cols} cols by ${night ? 'night' : 'day'}`,
  })),
);

const pixelsWith = (rows: readonly string[], key: string) =>
  rows.join('').split(key).length - 1;

describe('jungleScene', () => {
  it('is deterministic: the same input gives the same picture', () => {
    const first = jungleScene(90, HERO_HEIGHT, {
      night: true,
      holdRows: HOLDS,
    });
    jungleScene(60, 40, { night: false, holdRows: [] }); // unrelated call in between
    const second = jungleScene(90, HERO_HEIGHT, {
      night: true,
      holdRows: HOLDS,
    });
    expect(second).toEqual(first);
  });

  describe.each(CASES)('at $label', ({ cols, night }) => {
    const scene = jungleScene(cols, HERO_HEIGHT, { night, holdRows: HOLDS });
    const palette: Readonly<Record<string, string>> = night
      ? SCENE_COLORS.night
      : SCENE_COLORS.day;

    it('has one row per art pixel of height, each exactly `cols` wide', () => {
      expect(scene.rows).toHaveLength(HERO_HEIGHT);
      expect(scene.rows.filter(row => row.length !== cols)).toEqual([]);
    });

    it(night ? 'has fireflies' : 'has no fireflies', () => {
      const fireflies = pixelsWith(scene.rows, 'y');
      if (night) {
        expect(fireflies).toBeGreaterThan(0);
      } else {
        expect(fireflies).toBe(0);
      }
    });

    it('only uses keys that have a colour in its palette', () => {
      const keys = [...new Set(scene.rows.join(''))];
      expect(keys.filter(key => !(key in palette))).toEqual([]);
    });

    it('covers every pixel, so nothing behind it shows through', () => {
      expect(pixelsWith(scene.rows, '.')).toBe(0);
    });

    it('keeps the trunk inside the picture', () => {
      expect(scene.trunkWidth).toBeGreaterThan(0);
      expect(scene.trunkX).toBeGreaterThanOrEqual(0);
      expect(scene.trunkX + scene.trunkWidth).toBeLessThanOrEqual(cols);
    });
  });

  it('draws each hold on the trunk at its row and changes nothing else', () => {
    const bare = jungleScene(90, HERO_HEIGHT, { night: false, holdRows: [] });
    const held = jungleScene(90, HERO_HEIGHT, {
      night: false,
      holdRows: HOLDS,
    });
    expect([held.trunkX, held.trunkWidth]).toEqual([
      bare.trunkX,
      bare.trunkWidth,
    ]);

    const changed: { x: number; y: number }[] = [];
    bare.rows.forEach((row, y) => {
      [...row].forEach((key, x) => {
        if (held.rows[y][x] !== key) {
          changed.push({ x, y });
        }
      });
    });
    const offTrunk = changed.filter(
      ({ x }) => x < held.trunkX || x >= held.trunkX + held.trunkWidth,
    );
    const awayFromHolds = changed.filter(({ y }) =>
      HOLDS.every(hold => Math.abs(y - hold) > 2),
    );
    expect(offTrunk).toEqual([]);
    expect(awayFromHolds).toEqual([]);
    expect(HOLDS.filter(hold => !changed.some(({ y }) => y === hold))).toEqual(
      [],
    );
  });

  // Known bug, reported separately: the three sky bands are rounded on their
  // own (scene.ts, the three c.rect calls under "Sky in three flat bands"), so
  // at some heights the last band starts one row below where the middle band
  // ends and that row stays transparent: row 25 at 38 rows, 32 at 48 and 43 at
  // 64. The hero's 62 rows are not affected.
  // Change `it.failing` to `it` once the bands share their boundaries.
  it.failing(
    'covers every pixel at other heights too (known bug, expected to fail)',
    () => {
      for (const height of [38, 48, 64]) {
        const scene = jungleScene(90, height, { night: false, holdRows: [] });
        expect({ height, transparent: pixelsWith(scene.rows, '.') }).toEqual({
          height,
          transparent: 0,
        });
      }
    },
  );
});
