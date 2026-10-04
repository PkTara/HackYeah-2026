import { radialChart } from '../pixel/charts';

type Point = readonly [number, number];
type Geometry = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius: number;
  angles: number[];
};

const deg = (d: number) => (d * Math.PI) / 180;

// The same geometry as TerrainTriangle and MovementRadar.
const TRIANGLE: Geometry = {
  width: 61,
  height: 52,
  cx: 30,
  cy: 34,
  radius: 28,
  angles: [-90, 30, 150].map(deg),
};
const RADAR: Geometry = {
  width: 49,
  height: 45,
  cx: 24,
  cy: 24,
  radius: 20,
  angles: [-90, -18, 54, 126, 198].map(deg),
};

const CHARTS = [
  { name: 'terrain triangle', geometry: TRIANGLE, values: [0.8, 0.5, 0.6] },
  {
    name: 'movement radar',
    geometry: RADAR,
    values: [0.6, 0.7, 0.4, 0.8, 0.5],
  },
];

/** Coordinates of every pixel with the given key. */
function find(rows: readonly string[], key: string): Point[] {
  const out: Point[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((k, x) => {
      if (k === key) {
        out.push([x, y]);
      }
    });
  });
  return out;
}

const count = (rows: readonly string[], key: string) => find(rows, key).length;

/** The key at a point, rounded to the pixel it lands on. */
const at = (rows: readonly string[], [x, y]: Point) =>
  rows[Math.round(y)]?.[Math.round(x)] ?? '.';

/** Where `value` (0 to 1) sits along axis `i`. */
const along = (g: Geometry, i: number, value: number): Point => [
  g.cx + Math.cos(g.angles[i]) * g.radius * value,
  g.cy + Math.sin(g.angles[i]) * g.radius * value,
];

const withValue = (
  values: readonly (number | null)[],
  i: number,
  v: number | null,
) => values.map((old, j) => (j === i ? v : old));

/**
 * Marks the pixels that can be reached from the border without stepping on a
 * `wall` pixel (moving up, down, left or right). A closed 8-connected outline
 * is a wall this walk cannot cross.
 */
function outside(rows: readonly string[], wall: string): boolean[][] {
  const seen = rows.map(row => new Array<boolean>(row.length).fill(false));
  const stack: Point[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (y === 0 || y === rows.length - 1 || x === 0 || x === row.length - 1) {
        stack.push([x, y]);
      }
    }
  });
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (seen[y]?.[x] !== false || rows[y][x] === wall) {
      continue;
    }
    seen[y][x] = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

/** Distance from p to the segment a-b. */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

describe('radialChart', () => {
  describe.each(CHARTS)('$name', ({ geometry, values }) => {
    const chart = (o: {
      values?: readonly (number | null)[];
      focus?: number;
      striped?: boolean;
    }) => radialChart({ ...geometry, values, ...o });
    const axes = geometry.angles.map((_, i) => i);
    const centre: Point = [geometry.cx, geometry.cy];

    it('returns rows of the requested size', () => {
      const { rows } = chart({});
      expect(rows).toHaveLength(geometry.height);
      expect(rows.every(row => row.length === geometry.width)).toBe(true);
    });

    it('puts each tip at 100% along its axis', () => {
      const { tips } = chart({});
      expect(tips).toHaveLength(axes.length);
      tips.forEach((tip, i) => {
        const [x, y] = along(geometry, i, 1);
        expect(tip[0]).toBeCloseTo(x);
        expect(tip[1]).toBeCloseTo(y);
      });
    });

    it('draws the outer guide through every tip', () => {
      const { rows, tips } = chart({});
      expect(tips.map(tip => at(rows, tip))).toEqual(axes.map(() => 'g'));
    });

    describe('when every value is known', () => {
      it('marks each value at its distance from the centre', () => {
        const { rows } = chart({});
        const marks = axes.map(i => at(rows, along(geometry, i, values[i])));
        expect(marks).toEqual(axes.map(() => 'E'));
      });

      it('fills the shape and closes its outline around the centre', () => {
        const { rows } = chart({});
        expect(count(rows, 'F')).toBeGreaterThan(0);
        expect(at(rows, centre)).toBe('F');
        expect(outside(rows, 'E')[geometry.cy][geometry.cx]).toBe(false);
      });

      it('draws no dashed missing-value spokes', () => {
        expect(count(chart({}).rows, 'h')).toBe(0);
      });
    });

    describe('when a value is unknown', () => {
      it('never fills or stripes the shape', () => {
        const filled: string[] = [];
        for (const i of axes) {
          for (const striped of [false, true]) {
            const { rows } = chart({
              values: withValue(values, i, null),
              striped,
            });
            if (count(rows, 'F') + count(rows, 'S') > 0) {
              filled.push(`axis ${i}${striped ? ', striped' : ''}`);
            }
          }
        }
        expect(filled).toEqual([]);
      });

      it('does not draw it as zero', () => {
        // A known zero gets a mark next to the centre; an unknown value must not.
        const nearCentre = (rows: readonly string[]) =>
          find(rows, 'E').filter(
            ([x, y]) =>
              Math.abs(x - geometry.cx) <= 2 && Math.abs(y - geometry.cy) <= 2,
          ).length;
        for (const i of axes) {
          expect(
            nearCentre(chart({ values: withValue(values, i, 0) }).rows),
          ).toBeGreaterThan(0);
          expect(
            nearCentre(chart({ values: withValue(values, i, null) }).rows),
          ).toBe(0);
        }
      });

      it('leaves the outline open instead of closing it through that axis', () => {
        const closed = axes.filter(i => {
          const { rows } = chart({ values: withValue(values, i, null) });
          return !outside(rows, 'E')[geometry.cy][geometry.cx];
        });
        expect(closed).toEqual([]);
      });

      it('still marks the known values', () => {
        for (const i of axes) {
          const { rows } = chart({ values: withValue(values, i, null) });
          const known = axes.filter(j => j !== i);
          expect(
            known.map(j => at(rows, along(geometry, j, values[j]))),
          ).toEqual(known.map(() => 'E'));
        }
      });

      it('draws a dashed spoke along that axis only', () => {
        for (const i of axes) {
          const { rows, tips } = chart({ values: withValue(values, i, null) });
          const dashes = find(rows, 'h');
          expect(dashes.length).toBeGreaterThan(0);
          const offSpoke = dashes.filter(
            p => distanceToSegment(p, centre, tips[i]) > 1,
          );
          expect(offSpoke).toEqual([]);
        }
      });

      it('draws only guides when nothing is known', () => {
        const { rows } = chart({ values: axes.map(() => null), striped: true });
        expect([...new Set(rows.join(''))].sort()).toEqual([
          '.',
          'd',
          'g',
          'h',
        ]);
      });
    });

    describe('focus marker', () => {
      /** The 'Y' pixels must form a diamond of radius 2 around `point`. */
      const expectMarkerAt = (rows: readonly string[], point: Point) => {
        const [x, y] = point.map(Math.round);
        const marker = find(rows, 'Y');
        expect(at(rows, point)).toBe('Y');
        expect(marker).toHaveLength(13);
        expect(
          marker.every(([mx, my]) => Math.abs(mx - x) + Math.abs(my - y) <= 2),
        ).toBe(true);
        expect(count(rows, 'O')).toBe(12);
      };

      it('sits on the value of a known focus axis', () => {
        for (const i of axes) {
          const { rows } = chart({ focus: i });
          expectMarkerAt(rows, along(geometry, i, values[i]));
        }
      });

      it('sits on the tip of an unknown focus axis', () => {
        for (const i of axes) {
          const { rows, tips } = chart({
            values: withValue(values, i, null),
            focus: i,
          });
          expectMarkerAt(rows, tips[i]);
        }
      });

      it('is not drawn without a focus', () => {
        const { rows } = chart({});
        expect(count(rows, 'Y')).toBe(0);
        expect(count(rows, 'O')).toBe(0);
      });
    });

    describe('stripes for example data', () => {
      it('are only drawn when asked for', () => {
        expect(count(chart({}).rows, 'S')).toBe(0);
        expect(count(chart({ striped: true }).rows, 'S')).toBeGreaterThan(0);
      });

      it('recolour part of the fill and nothing else', () => {
        const plain = chart({}).rows;
        const striped = chart({ striped: true }).rows;
        const other: string[] = [];
        plain.forEach((row, y) => {
          [...row].forEach((k, x) => {
            const s = striped[y][x];
            if (s !== k && !(k === 'F' && s === 'S')) {
              other.push(`${x},${y}: ${k} -> ${s}`);
            }
          });
        });
        expect(other).toEqual([]);
        expect(count(striped, 'F')).toBeGreaterThan(0);
      });
    });

    // Known bug, reported separately: PixelCanvas.polygon() fills half a pixel
    // up and left of the outline drawn through the same points (it samples at
    // x + 0.5 while line() rounds), so fill pixels poke out past the edge and
    // empty pixels are left just inside it. See raster.test.ts.
    it(
      'keeps the fill inside the edge',
      () => {
        const { rows } = chart({ striped: true });
        const out = outside(rows, 'E');
        const fill = [...find(rows, 'F'), ...find(rows, 'S')];
        expect(fill.filter(([x, y]) => out[y][x])).toEqual([]);
        const enclosed = rows.flatMap((row, y) =>
          [...row].flatMap((k, x) =>
            !out[y][x] && !'EFS'.includes(k) ? [`${x},${y}`] : [],
          ),
        );
        expect(enclosed).toEqual([]);
      },
    );
  });
});

describe('radialChart partial fill (movement radar)', () => {
  const chart = (values: readonly (number | null)[], striped = false) =>
    radialChart({ ...RADAR, values, partial: true, striped });
  const centre: Point = [RADAR.cx, RADAR.cy];
  const tips = chart([1, 1, 1, 1, 1]).tips;
  const fill = (rows: readonly string[]) => [
    ...find(rows, 'F'),
    ...find(rows, 'S'),
  ];

  it('draws the same closed shape as before when every axis is known', () => {
    const values = [0.6, 0.7, 0.4, 0.8, 0.5];
    expect(chart(values).rows).toEqual(radialChart({ ...RADAR, values }).rows);
  });

  it('fills between neighbouring known axes and never across an unknown one', () => {
    const { rows } = chart([2 / 3, 2 / 3, 1 / 3, null, 1 / 3]);
    expect(fill(rows).length).toBeGreaterThan(0);
    // Away from the centre, no fill pixel sits on the unknown spoke.
    const onUnknown = fill(rows).filter(
      p =>
        distanceToSegment(p, centre, tips[3]) < 1 &&
        Math.hypot(p[0] - centre[0], p[1] - centre[1]) > 3,
    );
    expect(onUnknown).toEqual([]);
    // The unknown axis keeps its dashed spoke.
    const dashes = find(rows, 'h');
    expect(dashes.length).toBeGreaterThan(0);
    expect(dashes.filter(p => distanceToSegment(p, centre, tips[3]) > 1)).toEqual(
      [],
    );
  });

  it('leaves a known axis with no known neighbour as a spoke and a point', () => {
    const { rows } = chart([2 / 3, null, null, null, null]);
    expect(fill(rows)).toEqual([]);
    expect(at(rows, along(RADAR, 0, 2 / 3))).toBe('E');
  });

  it('draws only guides when nothing is known', () => {
    const { rows } = chart([null, null, null, null, null], true);
    expect([...new Set(rows.join(''))].sort()).toEqual(['.', 'd', 'g', 'h']);
  });

  it('stripes the partial fill for example data', () => {
    const values = [2 / 3, 2 / 3, 1 / 3, null, 1 / 3];
    expect(find(chart(values).rows, 'S')).toEqual([]);
    expect(find(chart(values, true).rows, 'S').length).toBeGreaterThan(0);
  });
});
