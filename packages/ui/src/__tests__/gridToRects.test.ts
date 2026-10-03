import { radialChart } from '../pixel/charts';
import { textRows } from '../pixel/font';
import { gridToRects, PixelCanvas, type PixelRect } from '../pixel/raster';
import { jungleScene } from '../pixel/scene';
import {
  GAZELLE_FRAMES,
  ICONS,
  LEFT_HAND_FINGERS,
  handRows,
  monkeyRows,
  type MonkeyPose,
} from '../pixel/sprites';

/**
 * Paints the rects onto an empty grid shaped like `rows`. Pixels painted twice
 * or outside the grid are counted instead of thrown, so a failure says what
 * went wrong.
 */
function paint(rows: readonly string[], rects: readonly PixelRect[]) {
  const cells = rows.map(row => new Array<string>(row.length).fill('.'));
  let overlaps = 0;
  let outside = 0;
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const row = cells[y];
        if (!row || x < 0 || x >= row.length) {
          outside++;
        } else if (row[x] !== '.') {
          overlaps++;
        } else {
          row[x] = r.key;
        }
      }
    }
  }
  return { grid: cells.map(row => row.join('')), overlaps, outside };
}

/** Same-key runs along the rows: the rect count without vertical merging. */
function rowRuns(rows: readonly string[]): number {
  return rows.reduce((n, row) => n + (row.match(/([^.])\1*/g) ?? []).length, 0);
}

// Every kind of picture the app draws, plus small grids for the edge cases.
const corpus: [string, readonly string[]][] = [];
const add = (name: string, rows: readonly string[]) => {
  corpus.push([name, rows]);
};

add('single pixel', ['...', '.A.', '...']);
add('solid 5x5 block', ['AAAAA', 'AAAAA', 'AAAAA', 'AAAAA', 'AAAAA']);
add('transparent only', ['....', '....']);
add('checkerboard', ['A.A.', '.A.A', 'A.A.', '.A.A']);
add('staircase', ['A...', 'AA..', 'AAA.', 'AAAA']);
add('hollow ring', ['BBBB', 'B..B', 'B..B', 'BBBB']);
add('alternating rows', ['AAAA', 'BBBB', 'AAAA', 'BBBB']);
add('run interrupted by a gap row', ['AA', '..', 'AA']);
add('runs of different widths', ['AAA', 'AA.', 'AAA']);
add('many keys', ['abcdefgh', 'hgfedcba', 'aabbccdd', 'abcdefgh']);

for (const [name, rows] of Object.entries(ICONS)) {
  add(`icon ${name}`, rows);
}

const POSES: MonkeyPose[] = ['idle', 'blink', 'cheer'];
const COSMETIC_SETS: string[][] = [
  [],
  ['headband'],
  ['leaf-crown'],
  ['headband', 'leaf-crown'],
];
for (const pose of POSES) {
  for (const cosmetics of COSMETIC_SETS) {
    add(
      `monkey ${pose} ${cosmetics.join('+') || 'plain'}`,
      monkeyRows(pose, cosmetics),
    );
  }
}

const ALL_FINGERS = Object.keys(LEFT_HAND_FINGERS);
for (const side of ['left', 'right'] as const) {
  add(`${side} hand`, handRows(side, []));
  add(`${side} hand, sore ring finger`, handRows(side, ['ring']));
  add(`${side} hand, every finger sore`, handRows(side, ALL_FINGERS));
}

GAZELLE_FRAMES.forEach((frame, i) => add(`gazelle frame ${i}`, frame));

add('text CLIMBING MONKEY', textRows('CLIMBING MONKEY'));
add('two lines of text', textRows('Level 2\nXP 40/50'));
add(
  'every glyph',
  textRows("ABCDEFGHIJKLMNOPQRSTUVWXYZ\n0123456789 .,!?:'-+/%()&=><*"),
);

const HOLDS = [31, 25, 18, 12, 6];
add(
  'day jungle, 60 cols',
  jungleScene(60, 62, { night: false, holdRows: HOLDS }).rows,
);
add(
  'night jungle, 120 cols',
  jungleScene(120, 62, { night: true, holdRows: HOLDS }).rows,
);

const deg = (d: number) => (d * Math.PI) / 180;
add(
  'terrain triangle with a gap and a focus',
  radialChart({
    width: 61,
    height: 52,
    cx: 30,
    cy: 34,
    radius: 28,
    angles: [-90, 30, 150].map(deg),
    values: [0.8, null, 0.6],
    focus: 1,
  }).rows,
);
add(
  'striped movement radar',
  radialChart({
    width: 49,
    height: 45,
    cx: 24,
    cy: 24,
    radius: 20,
    angles: [-90, -18, 54, 126, 198].map(deg),
    values: [0.6, 0.7, 0.4, 0.8, 0.5],
    striped: true,
  }).rows,
);

const dashes = new PixelCanvas(20, 8);
dashes.line(0, 0, 19, 7, 'a', 2);
dashes.line(0, 7, 19, 0, 'b', 3);
dashes.line(0, 4, 19, 4, 'c', 1);
add('dashed lines', dashes.rows());

describe('gridToRects', () => {
  it('returns no rects for an empty or fully transparent grid', () => {
    expect(gridToRects([])).toEqual([]);
    expect(gridToRects([''])).toEqual([]);
    expect(gridToRects(['...', '...'])).toEqual([]);
  });

  it('merges same-key pixels along a row and splits where the key changes', () => {
    expect(gridToRects(['AAAB.A'])).toEqual([
      { x: 0, y: 0, w: 3, h: 1, key: 'A' },
      { x: 3, y: 0, w: 1, h: 1, key: 'B' },
      { x: 5, y: 0, w: 1, h: 1, key: 'A' },
    ]);
  });

  it('stacks identical runs, so a 5x5 block of one key is a single rect', () => {
    const block = ['AAAAA', 'AAAAA', 'AAAAA', 'AAAAA', 'AAAAA'];
    expect(gridToRects(block)).toEqual([{ x: 0, y: 0, w: 5, h: 5, key: 'A' }]);
    expect(rowRuns(block)).toBe(5);
  });

  it('only stacks runs with the same x, width and key', () => {
    expect(gridToRects(['AAA', 'AA.'])).toEqual([
      { x: 0, y: 0, w: 3, h: 1, key: 'A' },
      { x: 0, y: 1, w: 2, h: 1, key: 'A' },
    ]);
    expect(gridToRects(['AA.', '.AA'])).toHaveLength(2);
    expect(gridToRects(['AA', 'BB'])).toHaveLength(2);
  });

  it('does not stack runs across a transparent row', () => {
    expect(gridToRects(['A', '.', 'A'])).toEqual([
      { x: 0, y: 0, w: 1, h: 1, key: 'A' },
      { x: 0, y: 2, w: 1, h: 1, key: 'A' },
    ]);
  });

  it('needs fewer rects than row runs for the jungle scene', () => {
    const scene = jungleScene(120, 62, { night: false, holdRows: HOLDS }).rows;
    expect(gridToRects(scene).length).toBeLessThan(rowRuns(scene));
  });

  describe('cache', () => {
    it('returns the same result for a different array with the same content', () => {
      const first = gridToRects(['AB', 'CD']);
      expect(gridToRects(['AB', 'CD'].slice())).toBe(first);
    });

    it('does not mix up grids that only differ in where the rows break', () => {
      expect(gridToRects(['AB'])).toEqual([
        { x: 0, y: 0, w: 1, h: 1, key: 'A' },
        { x: 1, y: 0, w: 1, h: 1, key: 'B' },
      ]);
      expect(gridToRects(['A', 'B'])).toEqual([
        { x: 0, y: 0, w: 1, h: 1, key: 'A' },
        { x: 0, y: 1, w: 1, h: 1, key: 'B' },
      ]);
    });

    it('still gives correct rects after many different grids', () => {
      const grid = ['ABBA', 'ABBA', 'B..B'];
      const before = gridToRects(grid);
      for (let i = 0; i < 1000; i++) {
        gridToRects([`C${'.'.repeat(i)}D`]);
      }
      const after = gridToRects(grid);
      expect(after).toEqual(before);
      expect(paint(grid, after).grid).toEqual(grid);
    });
  });

  describe('is lossless: painting the rects rebuilds the picture exactly', () => {
    it.each(corpus)('%s', (_name, rows) => {
      const { grid, overlaps, outside } = paint(rows, gridToRects(rows));
      expect(outside).toBe(0);
      expect(overlaps).toBe(0);
      expect(grid).toEqual([...rows]);
    });
  });

  describe('merges as much as its rules allow', () => {
    it.each(corpus)('%s', (_name, rows) => {
      const rects = gridToRects(rows);
      const invalid = rects.filter(r => r.key === '.' || r.w < 1 || r.h < 1);
      // Every row slice of a rect is a whole run: the same key does not
      // continue just left or right of it.
      const partialRuns = rects.filter(r =>
        rows
          .slice(r.y, r.y + r.h)
          .some(row => row[r.x - 1] === r.key || row[r.x + r.w] === r.key),
      );
      // No rect sits directly on top of an identical run it could have absorbed.
      const unmerged = rects.filter(a =>
        rects.some(
          b =>
            b.x === a.x && b.w === a.w && b.key === a.key && b.y === a.y + a.h,
        ),
      );
      expect(invalid).toEqual([]);
      expect(partialRuns).toEqual([]);
      expect(unmerged).toEqual([]);
    });
  });
});
