/**
 * The savanna behind the gazelle, generated for any screen width. The
 * gazelle mode version of scene.ts, with the same palette-key approach.
 * Layers back to front: sky, sun, flat-topped mountain, far acacias, grass,
 * the running track with a marker post per step, a big acacia and tufts.
 */
import { PixelCanvas } from './raster';

export const SAVANNA_COLORS = {
  day: {
    '1': '#9FD8E6',
    '2': '#FFD9A0',
    '3': '#FFC27A',
    u: '#FFF3B0', // sun
    U: '#FFB347', // sun rim
    p: '#B98A6A', // mountain
    P: '#9A6E52', // mountain shade
    w: '#FFF8EC', // snow cap
    f: '#C9A44A', // far grass
    m: '#D9B54A', // grass
    n: '#B08A2E', // grass shade
    t: '#C98A4B', // track
    T: '#A86C34', // track edge
    k: '#6B4423', // acacia trunk
    a: '#5C6B22', // acacia leaves
    A: '#7C8C2E', // acacia leaves light
    O: '#22180F',
    W: '#FFF4DC', // marker post
    R: '#E2463F',
    Y: '#FFD23F',
    B: '#3B7DD8',
  },
  night: {
    '1': '#120E2A',
    '2': '#2B1B44',
    '3': '#4A2A4E',
    u: '#F4E9CF',
    U: '#D8C9A8',
    p: '#3A2A3A',
    P: '#2A1E2C',
    w: '#BFB6C8',
    f: '#4A3A22',
    m: '#5C4826',
    n: '#3E2F18',
    t: '#4E3420',
    T: '#3A2616',
    k: '#2E1D12',
    a: '#1E2612',
    A: '#2C3618',
    O: '#05090A',
    W: '#D8CDB4',
    R: '#C23B33',
    Y: '#E0B530',
    B: '#2F5FA8',
    y: '#F9F871', // stars
  },
} as const;

/** Same Park-Miller generator as the jungle, so the scene never changes. */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export type SavannaLayout = Readonly<{
  rows: string[];
  /** Top row of the running track, in art pixels. */
  trackTop: number;
}>;

export function savannaScene(
  cols: number,
  height: number,
  opts: Readonly<{ night: boolean; markerXs: readonly number[] }>,
): SavannaLayout {
  const c = new PixelCanvas(cols, height);
  const rand = random(20261004);
  const sky = random(4101976);
  const horizon = height - 22;
  const trackTop = height - 8;

  // Sky in three flat bands.
  const band2 = Math.round(horizon * 0.45);
  const band3 = band2 + Math.round(horizon * 0.3);
  c.rect(0, 0, cols, band2, '1');
  c.rect(0, band2, cols, band3 - band2, '2');
  c.rect(0, band3, cols, height - band3, '3');

  if (opts.night) {
    for (let i = 0; i < 34; i++) {
      c.set(Math.floor(sky() * cols), Math.floor(sky() * horizon * 0.7), 'y');
    }
  }

  // A big low sun (or moon) sitting on the horizon.
  const sx = Math.round(cols * 0.62);
  for (let y = -11; y <= 0; y++) {
    for (let x = -11; x <= 11; x++) {
      const d = x * x + y * y;
      if (d <= 121) {
        c.set(sx + x, horizon + y, d > 90 ? 'U' : 'u');
      }
    }
  }

  // A flat-topped mountain with a snow cap, behind the title.
  const mx = Math.round(cols * 0.22);
  for (let y = 0; y < 18; y++) {
    const half = 7 + y * 2;
    const top = horizon - 18 + y;
    c.rect(mx - half, top, half * 2, 1, 'p');
    c.rect(mx + Math.round(half * 0.4), top, Math.round(half * 0.6), 1, 'P');
    if (y < 3) {
      c.rect(mx - half + 2, top, half * 2 - 4, 1, 'w');
    }
  }

  // Far grass line, stepped in twos so neighbouring columns share rows.
  const stepped = (v: number) => 2 * Math.round(v / 2);
  for (let x = 0; x < cols; x++) {
    const rise = stepped(2 + Math.sin(x / 5) + Math.sin(x / 2.3 + 1));
    c.rect(x, horizon - rise, 1, height - horizon + rise, 'f');
  }

  // Small acacias on the horizon.
  for (let x = 10, i = 0; x < cols - 10; x += 22 + (i % 3) * 9, i++) {
    if (Math.abs(x - sx) < 14) {
      continue; // keep the sun clear
    }
    c.rect(x, horizon - 5, 1, 5, 'k');
    c.rect(x - 4, horizon - 7, 9, 2, 'a');
    c.rect(x - 2, horizon - 8, 5, 1, 'a');
  }

  // Near grass, a little brighter.
  c.rect(0, horizon + 4, cols, height - horizon - 4, 'm');
  for (let x = 0; x < cols; x++) {
    const tuft = stepped(1 + Math.sin(x / 3.1) * 1.5);
    if (tuft > 0) {
      c.rect(x, horizon + 4 - tuft, 1, tuft, 'm');
    }
  }
  for (let x = 1; x < cols; x += 4 + Math.floor(rand() * 5)) {
    const y = horizon + 6 + Math.floor(rand() * (trackTop - horizon - 9));
    c.set(x, y, 'n');
    c.set(x + 1, y - 1, 'n');
  }

  // The running track.
  c.rect(0, trackTop, cols, height - trackTop, 't');
  c.rect(0, trackTop, cols, 1, 'T');
  for (let x = 3; x < cols; x += 9) {
    c.rect(x, trackTop + 4, 4, 1, 'T');
  }

  // A marker post for every step of the level; the last one is the finish.
  const flagColors = ['Y', 'R', 'B'];
  opts.markerXs.forEach((x, i) => {
    const last = i === opts.markerXs.length - 1;
    c.rect(x, trackTop - 12, 2, 13, 'O');
    c.rect(x, trackTop - 11, 1, 11, 'W');
    if (last) {
      // Chequered finish flag.
      c.rect(x + 2, trackTop - 12, 7, 6, 'O');
      for (let fy = 0; fy < 4; fy++) {
        for (let fx = 0; fx < 5; fx++) {
          c.set(x + 3 + fx, trackTop - 11 + fy, (fx + fy) % 2 ? 'O' : 'W');
        }
      }
    } else {
      c.rect(x + 2, trackTop - 12, 5, 4, 'O');
      c.rect(x + 2, trackTop - 11, 4, 2, flagColors[i % flagColors.length]);
    }
  });

  // A big acacia on the right edge, its flat crown off the top of the scene.
  const ax = cols - 9;
  c.rect(ax, 10, 3, trackTop - 10, 'k');
  c.line(ax + 1, 14, ax - 9, 6, 'k');
  c.line(ax + 1, 18, ax + 8, 9, 'k');
  c.rect(ax - 22, 2, 34, 5, 'a');
  c.rect(ax - 18, 0, 28, 3, 'A');
  c.rect(ax - 26, 5, 14, 2, 'a');

  // Tall grass tufts in the front corners.
  [2, 5, 8, cols - 14, cols - 11].forEach((x, i) => {
    const h = 5 + (i % 2) * 3;
    c.line(x, height, x - 1, height - h, 'n');
    c.line(x + 1, height, x + 2, height - h + 1, 'm');
  });

  return { rows: c.rows(), trackTop };
}
