import { art, mirror, overlay, PixelCanvas } from '../pixel/raster';

type Point = readonly [number, number];

/** Coordinates of every pixel with the given key, row by row. */
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

/** True when every pixel can reach every other one through its 8 neighbours. */
function connected8(points: readonly Point[]): boolean {
  if (points.length === 0) {
    return true;
  }
  const left = new Set(points.map(([x, y]) => `${x},${y}`));
  const queue = points.slice(0, 1);
  left.delete(`${queue[0][0]},${queue[0][1]}`);
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const id = `${x + dx},${y + dy}`;
        if (left.delete(id)) {
          queue.push([x + dx, y + dy]);
        }
      }
    }
  }
  return left.size === 0;
}

/**
 * Marks the pixels that can be reached from the border without stepping on a
 * `wall` pixel (moving up, down, left or right). An 8-connected line is a
 * closed wall for this walk.
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

describe('art', () => {
  it('trims the indentation and drops blank lines at both ends', () => {
    expect(
      art(`
        .A.
        AAA
      `),
    ).toEqual(['.A.', 'AAA']);
  });

  it('returns no rows for a blank picture', () => {
    expect(art('\n    \n')).toEqual([]);
  });
});

describe('mirror', () => {
  it('flips every row left to right', () => {
    expect(mirror(['AB.', 'C..'])).toEqual(['.BA', '..C']);
  });

  it('gives back the original when applied twice and leaves its input alone', () => {
    const rows = ['ABC', 'D.E'];
    expect(mirror(mirror(rows))).toEqual(['ABC', 'D.E']);
    expect(rows).toEqual(['ABC', 'D.E']);
  });
});

describe('overlay', () => {
  const base = ['....', '....', '....'];

  it('writes the patch at the given offset', () => {
    expect(overlay(base, ['AB', 'CD'], 1, 1)).toEqual(['....', '.AB.', '.CD.']);
  });

  it("keeps the pixel underneath where the patch has '.'", () => {
    expect(overlay(['ABCD'], ['x.y.'])).toEqual(['xByD']);
  });

  it("erases the pixel underneath where the patch has '_'", () => {
    expect(overlay(['ABCD'], ['_x._'])).toEqual(['.xC.']);
  });

  it('clips a patch that hangs over any edge without growing the picture', () => {
    expect(overlay(base, ['AB', 'CD'], 3, 2)).toEqual(['....', '....', '...A']);
    expect(overlay(base, ['AB', 'CD'], -1, -1)).toEqual([
      'D...',
      '....',
      '....',
    ]);
  });

  it('does not change its inputs', () => {
    const rows = ['....'];
    const patch = ['AB'];
    overlay(rows, patch, 1);
    expect(rows).toEqual(['....']);
    expect(patch).toEqual(['AB']);
  });
});

describe('PixelCanvas', () => {
  it('starts fully transparent at the requested size', () => {
    const c = new PixelCanvas(4, 3);
    expect([c.width, c.height]).toEqual([4, 3]);
    expect(c.rows()).toEqual(['....', '....', '....']);
  });

  it('set rounds to the nearest pixel and get reads it back', () => {
    const c = new PixelCanvas(4, 3);
    c.set(1.4, 0.6, 'a');
    expect(c.get(1, 1)).toBe('a');
    expect(c.rows()).toEqual(['....', '.a..', '....']);
  });

  it("ignores pixels outside the canvas and reads them as '.'", () => {
    const c = new PixelCanvas(3, 2);
    c.set(-1, 0, 'x');
    c.set(3, 0, 'x');
    c.set(0, -1, 'x');
    c.set(0, 2, 'x');
    expect(c.rows()).toEqual(['...', '...']);
    expect(c.get(-1, 0)).toBe('.');
    expect(c.get(9, 9)).toBe('.');
  });

  it('rect fills an area and clips it to the canvas', () => {
    const c = new PixelCanvas(5, 4);
    c.rect(1, 1, 3, 2, 'r');
    c.rect(4, 3, 5, 5, 'q');
    c.rect(-2, -2, 3, 3, 'p');
    expect(c.rows()).toEqual(['p....', '.rrr.', '.rrr.', '....q']);
  });

  it('rows() returns a copy that later drawing does not change', () => {
    const c = new PixelCanvas(2, 1);
    const before = c.rows();
    c.set(0, 0, 'x');
    expect(before).toEqual(['..']);
    expect(c.rows()).toEqual(['x.']);
  });

  describe('line', () => {
    it('draws straight and diagonal lines including both ends', () => {
      const c = new PixelCanvas(5, 5);
      c.line(0, 0, 4, 0, 'h');
      c.line(0, 1, 0, 4, 'v');
      c.line(1, 1, 4, 4, 'd');
      expect(c.rows()).toEqual(['hhhhh', 'vd...', 'v.d..', 'v..d.', 'v...d']);
    });

    it('draws a single pixel when both ends are the same point', () => {
      const c = new PixelCanvas(3, 3);
      c.line(1, 1, 1, 1, 'x');
      expect(c.rows()).toEqual(['...', '.x.', '...']);
    });

    it('rounds the end points to whole pixels', () => {
      const c = new PixelCanvas(6, 1);
      c.line(0.6, 0.2, 3.4, -0.3, 'x');
      expect(c.rows()).toEqual(['.xxx..']);
    });

    it('steps one pixel at a time along the longer axis, with no gaps, in every direction', () => {
      // From the centre of an 11x11 canvas to every border pixel.
      const ends: Point[] = [];
      for (let i = 0; i <= 10; i++) {
        ends.push([i, 0], [i, 10], [0, i], [10, i]);
      }
      const problems: string[] = [];
      for (const [x1, y1] of ends) {
        const c = new PixelCanvas(11, 11);
        c.line(5, 5, x1, y1, 'x');
        const pixels = find(c.rows(), 'x');
        const expected = Math.max(Math.abs(x1 - 5), Math.abs(y1 - 5)) + 1;
        const ok =
          pixels.length === expected &&
          c.get(5, 5) === 'x' &&
          c.get(x1, y1) === 'x' &&
          connected8(pixels);
        if (!ok) {
          problems.push(`5,5 -> ${x1},${y1}`);
        }
      }
      expect(problems).toEqual([]);
    });

    it('alternates `dash` drawn pixels with `dash` skipped ones', () => {
      const dashed = (dash: number) => {
        const c = new PixelCanvas(10, 1);
        c.line(0, 0, 9, 0, 'x', dash);
        return c.rows()[0];
      };
      expect(dashed(0)).toBe('xxxxxxxxxx');
      expect(dashed(1)).toBe('x.x.x.x.x.');
      expect(dashed(2)).toBe('xx..xx..xx');
      expect(dashed(3)).toBe('xxx...xxx.');
    });

    it('dashes diagonal lines by step too', () => {
      const c = new PixelCanvas(6, 6);
      c.line(0, 0, 5, 5, 'x', 2);
      expect(c.rows()).toEqual([
        'x.....',
        '.x....',
        '......',
        '......',
        '....x.',
        '.....x',
      ]);
    });
  });

  describe('polygon', () => {
    it('fills a concave shape and leaves its notch empty', () => {
      // An L: the top right quarter is the notch.
      const c = new PixelCanvas(12, 12);
      c.polygon(
        [
          [1, 1],
          [5, 1],
          [5, 6],
          [10, 6],
          [10, 10],
          [1, 10],
        ],
        'x',
      );
      for (const [x, y] of [
        [2, 2],
        [3, 8],
        [8, 8],
      ]) {
        expect(c.get(x, y)).toBe('x');
      }
      for (const [x, y] of [
        [8, 3],
        [7, 2],
        [0, 0],
        [11, 11],
      ]) {
        expect(c.get(x, y)).toBe('.');
      }
    });

    it('uses the even-odd rule, so a pentagram leaves its centre empty', () => {
      // Five points joined to every second one: the middle is crossed twice.
      const star = [0, 2, 4, 1, 3].map((k): Point => {
        const a = ((-90 + 72 * k) * Math.PI) / 180;
        return [20 + 18 * Math.cos(a), 20 + 18 * Math.sin(a)];
      });
      const c = new PixelCanvas(41, 41);
      c.polygon(star, 'x');
      expect(c.get(20, 20)).toBe('.');
      expect(c.get(20, 6)).toBe('x'); // in the top arm
      expect(c.get(28, 8)).toBe('.'); // between the top and right arms
    });

    it('draws nothing with fewer than three points', () => {
      const c = new PixelCanvas(5, 5);
      c.polygon([], 'x');
      c.polygon([[2, 2]], 'x');
      c.polygon(
        [
          [0, 0],
          [4, 4],
        ],
        'x',
      );
      expect(find(c.rows(), 'x')).toEqual([]);
    });

    it('clips a shape that is larger than the canvas', () => {
      const c = new PixelCanvas(4, 3);
      c.polygon(
        [
          [-5, -5],
          [20, -5],
          [20, 20],
          [-5, 20],
        ],
        'x',
      );
      expect(c.rows()).toEqual(['xxxx', 'xxxx', 'xxxx']);
    });

    // Known bug, reported separately: polygon() samples each pixel at
    // (x + 0.5, y + 0.5) while set() and line() put a point on the pixel
    // Math.round(x). The fill ends up half a pixel up and left of an outline
    // through the same points: it pokes out past the top and left edges and
    // leaves holes along the bottom and right ones. Here (2, 0) is filled
    // outside the outline and (1, 2) stays empty inside it.
    it(
      'fills exactly the pixels its outline encloses',
      () => {
        const triangle: Point[] = [
          [4, 0],
          [0, 1],
          [0, 4],
        ];
        const c = new PixelCanvas(9, 9);
        c.polygon(triangle, 'F');
        c.outline(triangle, 'E');
        const rows = c.rows();
        const out = outside(rows, 'E');
        expect(find(rows, 'F').filter(([x, y]) => out[y][x])).toEqual([]);
        expect(find(rows, '.').filter(([x, y]) => !out[y][x])).toEqual([]);
      },
    );
  });

  it('outline draws every side, including the one back to the first point', () => {
    const c = new PixelCanvas(5, 5);
    c.outline(
      [
        [0, 0],
        [3, 0],
        [3, 3],
        [0, 3],
      ],
      'x',
    );
    expect(c.rows()).toEqual(['xxxx.', 'x..x.', 'x..x.', 'xxxx.', '.....']);
  });
});

describe('PixelCanvas.line with bad input', () => {
  it('returns at once for a NaN or infinite end point instead of hanging', () => {
    const c = new PixelCanvas(5, 5);
    c.line(0, 0, Number.NaN, 2, 'x');
    c.line(0, 0, 3, Number.POSITIVE_INFINITY, 'x');
    expect(c.rows().join('')).not.toContain('x');
  });
});
