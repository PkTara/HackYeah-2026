/**
 * The jungle behind the monkey, generated for any screen width.
 * Layers back to front: sky, sun, far trees, canopy, vines, the climbing
 * trunk with its holds, front leaves and the ground.
 */
import { PixelCanvas } from './raster';

export const SCENE_COLORS = {
  day: {
    '1': '#8ED1B8',
    '2': '#B4E3B9',
    '3': '#D9F0BE',
    u: '#FFF0A6',
    f: '#6DB56F',
    m: '#3E8E4A',
    n: '#24563A',
    v: '#2E6B37',
    l: '#7BC255',
    k: '#7A4A2A',
    K: '#5A3520',
    h: '#9C6539',
    Y: '#FFD23F',
    R: '#E2463F',
    A: '#4FB3D9',
    O: '#22180F',
    g: '#2F6E3A',
    G: '#4F9A4B',
  },
  night: {
    '1': '#0B1A2E',
    '2': '#11284A',
    '3': '#173A5A',
    u: '#F4E9CF',
    f: '#1F4A45',
    m: '#173A30',
    n: '#0E261E',
    v: '#1B4430',
    l: '#2F6E45',
    k: '#4A2E1C',
    K: '#331F12',
    h: '#5E3B23',
    Y: '#E0B530',
    R: '#C23B33',
    A: '#3F94B5',
    O: '#05090A',
    g: '#12301F',
    G: '#1E4A2C',
    y: '#F9F871', // fireflies
  },
} as const;

/**
 * Small deterministic random generator (Park-Miller), so the scene looks the
 * same on every render and every device.
 */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export type SceneLayout = Readonly<{
  rows: string[];
  /** Left column of the trunk, in art pixels. */
  trunkX: number;
  trunkWidth: number;
}>;

export function jungleScene(
  cols: number,
  height: number,
  opts: Readonly<{ night: boolean; holdRows: readonly number[] }>,
): SceneLayout {
  const c = new PixelCanvas(cols, height);
  const rand = random(20261003);
  // Stars and fireflies draw from their own generator, so the jungle is the
  // same shape by day and by night.
  const sky = random(7031962);
  const trunkWidth = 12;
  const trunkX = cols - trunkWidth - 12;

  // Sky in three flat bands that share their edges.
  const band2 = Math.round(height * 0.38);
  const band3 = band2 + Math.round(height * 0.3);
  c.rect(0, 0, cols, band2, '1');
  c.rect(0, band2, cols, band3 - band2, '2');
  c.rect(0, band3, cols, height - band3, '3');

  // Sun (or moon) low on the left.
  const sx = Math.round(cols * 0.36);
  const sy = Math.round(height * 0.56);
  for (let y = -7; y <= 7; y++) {
    for (let x = -7; x <= 7; x++) {
      if (x * x + y * y <= 44) {
        c.set(sx + x, sy + y, 'u');
      }
    }
  }
  if (opts.night) {
    for (let i = 0; i < 26; i++) {
      c.set(Math.floor(sky() * cols), Math.floor(sky() * height * 0.5), 'u');
    }
  }

  // Far trees rising from the bottom, far canopy hanging from the top.
  // Heights change in steps of two pixels so neighbouring columns share
  // rows, which keeps the number of drawn rectangles low.
  const stepped = (v: number) => 2 * Math.round(v / 2);
  for (let x = 0; x < cols; x++) {
    const hill = stepped(13 + 4 * Math.sin(x / 6) + 3 * Math.sin(x / 2.7 + 1));
    c.rect(x, height - hill, 1, hill, 'f');
    const drop = stepped(8 + 3 * Math.sin(x / 4.5 + 1) + 2 * Math.sin(x / 1.9));
    c.rect(x, 0, 1, drop, 'f');
  }
  // Nearer canopy and bushes.
  for (let x = 0; x < cols; x++) {
    const top = stepped(4 + 2 * Math.sin(x / 3.3 + 2));
    c.rect(x, 0, 1, top, 'm');
    const bush = stepped(8 + 3 * Math.sin(x / 4 + 0.5));
    c.rect(x, height - bush, 1, bush, 'm');
  }

  // Vines hanging from the canopy, with leaves on alternate sides.
  const vineXs: number[] = [];
  for (let x = 5, i = 0; x < trunkX - 2; x += 8 + (i % 3) * 2, i++) {
    vineXs.push(x);
  }
  vineXs.forEach((vx, i) => {
    const length = 14 + Math.floor(rand() * (height * 0.45));
    for (let y = 2; y < length; y++) {
      const x = vx + (Math.floor(y / 9) % 2);
      c.set(x, y, 'v');
      if (y % 4 === i % 4) {
        c.set(x + (y % 8 < 4 ? 1 : -1), y, 'l');
      }
    }
    const end = length;
    const ex = vx + (Math.floor(end / 9) % 2);
    c.rect(ex - 1, end, 3, 2, 'l');
    c.set(ex, end + 2, 'l');
  });

  // The trunk the monkey climbs, with long bark grain lines.
  c.rect(trunkX, 0, trunkWidth, height, 'k');
  c.rect(trunkX, 0, 1, height, 'K');
  c.rect(trunkX + trunkWidth - 1, 0, 1, height, 'K');
  c.rect(trunkX + 2, 0, 1, height, 'h');
  [5, 8].forEach((dx, i) => {
    for (let y = i * 5; y < height; y += 14) {
      c.rect(trunkX + dx, y, 1, 9, 'K');
    }
  });

  // A hold on the trunk for every step of the level.
  const holdColors = ['Y', 'R', 'A'];
  opts.holdRows.forEach((y, i) => {
    const x = trunkX + 3 + (i % 2) * 2;
    c.rect(x, y - 1, 5, 4, 'O');
    c.rect(x + 1, y, 3, 2, holdColors[i % holdColors.length]);
  });

  // Big front leaves in the bottom corners.
  leaf(c, 0, height - 2, 18, -0.55, 6);
  leaf(c, 6, height, 14, -1.1, 5);
  leaf(c, cols - 1, height - 1, 13, -2.4, 5);

  // Ground with grass tufts.
  c.rect(0, height - 3, cols, 3, 'g');
  for (let x = 0; x < cols; x += 3 + Math.floor(rand() * 4)) {
    c.set(x, height - 4, 'G');
    c.set(x + 1, height - 5, 'G');
  }

  if (opts.night) {
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(sky() * (trunkX - 4));
      const y = Math.floor(height * 0.3 + sky() * height * 0.5);
      c.set(x, y, 'y');
    }
  }

  return { rows: c.rows(), trunkX, trunkWidth };
}

/** A pointed leaf from (x, y) along `angle` (radians), with a midrib. */
function leaf(
  c: PixelCanvas,
  x: number,
  y: number,
  length: number,
  angle: number,
  width: number,
) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const points: [number, number][] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = Math.sin(Math.PI * t) * width;
    points.push([x + dx * length * t - dy * w, y + dy * length * t + dx * w]);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const w = Math.sin(Math.PI * t) * width;
    points.push([x + dx * length * t + dy * w, y + dy * length * t - dx * w]);
  }
  c.polygon(points, 'n');
  c.line(x, y, x + dx * length * 0.85, y + dy * length * 0.85, 'm');
}
