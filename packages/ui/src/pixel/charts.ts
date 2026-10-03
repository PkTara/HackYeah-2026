/**
 * Radial charts (terrain triangle, movement radar) drawn as pixel art.
 *
 * Keys: g outer guide, d dotted guides, h dashed spoke for a missing value,
 * F fill, S stripe (example data), E edge, Y focus marker, O marker outline.
 */
import { PixelCanvas } from './raster';

export type RadialChart = Readonly<{
  rows: string[];
  /** 100% points for each axis, in art pixels. */
  tips: readonly (readonly [number, number])[];
}>;

export function radialChart(o: {
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius: number;
  /** Radians, 0 = right, clockwise because y grows downwards. */
  angles: readonly number[];
  /** 0 to 1, or null when unknown. Unknown axes are never drawn as zero. */
  values: readonly (number | null)[];
  focus?: number;
  /** Striped fill marks example data. */
  striped?: boolean;
}): RadialChart {
  const c = new PixelCanvas(o.width, o.height);
  const n = o.angles.length;
  const point = (i: number, r: number): [number, number] => [
    o.cx + Math.cos(o.angles[i]) * o.radius * r,
    o.cy + Math.sin(o.angles[i]) * o.radius * r,
  ];
  const tips = o.angles.map((_, i) => point(i, 1));

  // Guides: half-way ring, spokes and the outer edge.
  const half = o.angles.map((_, i) => point(i, 0.5));
  half.forEach((p, i) => {
    const q = half[(i + 1) % n];
    c.line(p[0], p[1], q[0], q[1], 'd', 1);
  });
  tips.forEach((t, i) => {
    const missing = o.values[i] === null;
    c.line(o.cx, o.cy, t[0], t[1], missing ? 'h' : 'd', missing ? 2 : 1);
  });
  c.outline(tips, 'g');

  // The climber's shape. Only closed when every axis is known.
  const pts = o.values.map((v, i) => point(i, Math.max(v ?? 0, 0.05)));
  const known = o.values.map(v => v !== null);
  if (known.every(Boolean)) {
    c.polygon(pts, 'F');
    if (o.striped) {
      for (let y = 0; y < o.height; y++) {
        for (let x = 0; x < o.width; x++) {
          if (c.get(x, y) === 'F' && (x + y) % 4 < 2) {
            c.set(x, y, 'S');
          }
        }
      }
    }
    c.outline(pts, 'E');
  } else {
    pts.forEach((p, i) => {
      const j = (i + 1) % n;
      if (known[i] && known[j]) {
        c.line(p[0], p[1], pts[j][0], pts[j][1], 'E');
      }
    });
  }
  pts.forEach((p, i) => {
    if (known[i]) {
      c.rect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3, 'E');
    }
  });

  // Focus marker: a banana diamond on the focus axis.
  if (o.focus !== undefined) {
    const [fx, fy] = known[o.focus] ? pts[o.focus] : tips[o.focus];
    const x = Math.round(fx);
    const y = Math.round(fy);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d <= 3) {
          c.set(x + dx, y + dy, d === 3 ? 'O' : 'Y');
        }
      }
    }
  }

  return { rows: c.rows(), tips };
}
