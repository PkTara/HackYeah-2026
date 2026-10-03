/**
 * Pixel art as data. A picture is a list of equal-length strings; each
 * character is a palette key and '.' is transparent.
 *
 * To draw it we merge pixels into as few rectangles as possible (one View
 * each): same-key runs along a row, then identical runs stacked over rows.
 */

export type PixelRect = Readonly<{
  x: number;
  y: number;
  w: number;
  h: number;
  key: string;
}>;

const cache = new Map<string, PixelRect[]>();

export function gridToRects(rows: readonly string[]): PixelRect[] {
  const cacheKey = rows.join('\n');
  const hit = cache.get(cacheKey);
  if (hit) {
    return hit;
  }

  const rects: { x: number; y: number; w: number; h: number; key: string }[] =
    [];
  let open = new Map<string, (typeof rects)[number]>();

  rows.forEach((row, y) => {
    const nextOpen = new Map<string, (typeof rects)[number]>();
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) {
        end++;
      }
      if (key !== '.') {
        const id = `${x}:${end - x}:${key}`;
        const above = open.get(id);
        if (above && above.y + above.h === y) {
          above.h += 1;
          nextOpen.set(id, above);
        } else {
          const rect = { x, y, w: end - x, h: 1, key };
          rects.push(rect);
          nextOpen.set(id, rect);
        }
      }
      x = end;
    }
    open = nextOpen;
  });

  if (cache.size > 400) {
    cache.clear();
  }
  cache.set(cacheKey, rects);
  return rects;
}

/** Turns a template literal picture into rows, dropping blank edge lines. */
export function art(picture: string): string[] {
  const lines = picture.split('\n').map(line => line.trim());
  while (lines.length && lines[0] === '') {
    lines.shift();
  }
  while (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

export function mirror(rows: readonly string[]): string[] {
  return rows.map(row => row.split('').reverse().join(''));
}

/** Writes `patch` over `rows` at (x, y). '.' in the patch keeps the pixel. */
export function overlay(
  rows: readonly string[],
  patch: readonly string[],
  x = 0,
  y = 0,
): string[] {
  const out = rows.map(row => row.split(''));
  patch.forEach((line, dy) => {
    line.split('').forEach((key, dx) => {
      const row = out[y + dy];
      if (key !== '.' && row && x + dx < row.length) {
        row[x + dx] = key;
      }
    });
  });
  return out.map(row => row.join(''));
}

/** A small drawing surface for charts and scenery built in code. */
export class PixelCanvas {
  private readonly cells: string[][];

  constructor(readonly width: number, readonly height: number) {
    this.cells = Array.from({ length: height }, () =>
      new Array<string>(width).fill('.'),
    );
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? '.';
  }

  set(x: number, y: number, key: string): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi >= 0 && yi >= 0 && xi < this.width && yi < this.height) {
      this.cells[yi][xi] = key;
    }
  }

  rect(x: number, y: number, w: number, h: number, key: string): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        this.set(xx, yy, key);
      }
    }
  }

  /** Bresenham line. With `dash`, draws `dash` pixels then skips `dash`. */
  line(x0: number, y0: number, x1: number, y1: number, key: string, dash = 0) {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (let step = 0; ; step++) {
      if (!dash || Math.floor(step / dash) % 2 === 0) {
        this.set(x, y, key);
      }
      if (x === xe && y === ye) {
        break;
      }
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Fills a convex or concave polygon (even-odd rule, pixel centres). */
  polygon(points: readonly (readonly [number, number])[], key: string) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (inside(points, x + 0.5, y + 0.5)) {
          this.set(x, y, key);
        }
      }
    }
  }

  outline(points: readonly (readonly [number, number])[], key: string) {
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length];
      this.line(p[0], p[1], q[0], q[1], key);
    });
  }

  rows(): string[] {
    return this.cells.map(row => row.join(''));
  }
}

function inside(
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      hit = !hit;
    }
  }
  return hit;
}
