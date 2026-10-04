/**
 * The sea behind the dolphin, generated for any screen width. The dolphin
 * mode version of scene.ts and savanna.ts, with the same palette-key
 * approach. Layers back to front: sky, sun, clouds, the water in three
 * depths, a buoy per step on the surface, a palm island, the sea floor with
 * rocks, coral and seaweed, and bubbles.
 */
import { PixelCanvas } from './raster';

export const OCEAN_COLORS = {
  day: {
    '1': '#8FD3F4',
    '2': '#BDE8F7',
    u: '#FFF3B0', // sun
    U: '#FFD86B', // sun rim
    w: '#FFFFFF', // clouds
    f: '#EAF8FF', // surface foam
    b: '#4FB3E0', // shallow water
    c: '#2E8CC4', // mid water
    d: '#1E6AA0', // deep water
    o: '#CFEFFF', // bubbles
    s: '#E8D29A', // sand
    S: '#C9B276', // sand shade
    g: '#2E9C6A', // seaweed
    G: '#1F7550', // seaweed shade
    p: '#FF8A65', // coral
    P: '#E0603F', // coral shade
    r: '#6F7F8C', // rock
    k: '#8A5A2B', // palm trunk
    a: '#3E8E4A', // palm leaves
    A: '#7BC255', // palm leaves light
    O: '#22180F',
    W: '#FFF4DC', // buoy stripe, flag
    R: '#E2463F',
    Y: '#FFD23F',
    B: '#3B7DD8',
  },
  night: {
    '1': '#0B1530',
    '2': '#16264A',
    u: '#F4E9CF',
    U: '#D8C9A8',
    w: '#3A4A6A',
    f: '#8FB4CC',
    b: '#18486E',
    c: '#11385A',
    d: '#0A2640',
    o: '#4F7FA0',
    s: '#6B5E40',
    S: '#54492F',
    g: '#1A5440',
    G: '#113A2C',
    p: '#B5583E',
    P: '#8E412C',
    r: '#3A4650',
    k: '#4A3018',
    a: '#1E4A2A',
    A: '#2F6E45',
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

export type OceanLayout = Readonly<{
  rows: string[];
  /** Row of the calm water line under the waves, in art pixels. */
  surface: number;
}>;

export function oceanScene(
  cols: number,
  height: number,
  opts: Readonly<{ night: boolean; markerXs: readonly number[] }>,
): OceanLayout {
  const c = new PixelCanvas(cols, height);
  const rand = random(20261005);
  const sky = random(5101977);
  const surface = 28; // below the title, so its letters stay clear
  const floor = height - 6;

  // Sky in two flat bands.
  c.rect(0, 0, cols, 12, '1');
  c.rect(0, 12, cols, surface - 12, '2');
  if (opts.night) {
    for (let i = 0; i < 26; i++) {
      c.set(Math.floor(sky() * cols), Math.floor(sky() * (surface - 4)), 'y');
    }
  }

  // Sun (or moon) high in the middle.
  const sx = Math.round(cols * 0.62);
  for (let y = -6; y <= 6; y++) {
    for (let x = -6; x <= 6; x++) {
      const d = x * x + y * y;
      if (d <= 36) {
        c.set(sx + x, 11 + y, d > 25 ? 'U' : 'u');
      }
    }
  }

  // A few flat clouds.
  for (let x = 6, i = 0; x < cols - 8; x += 26 + (i % 3) * 7, i++) {
    const y = 3 + (i % 2) * 4;
    c.rect(x, y, 10, 2, 'w');
    c.rect(x + 2, y - 1, 5, 1, 'w');
  }

  // Water in three depths, shallow at the top.
  const band2 = surface + Math.round((floor - surface) * 0.35);
  const band3 = surface + Math.round((floor - surface) * 0.7);
  c.rect(0, surface, cols, band2 - surface, 'b');
  c.rect(0, band2, cols, band3 - band2, 'c');
  c.rect(0, band3, cols, height - band3, 'd');

  // Waves: crests above the calm line, foam on top.
  for (let x = 0; x < cols; x++) {
    const crest = Math.round(1 + Math.sin(x / 3) * 1.2);
    if (crest > 0) {
      c.rect(x, surface - crest, 1, crest, 'b');
    }
    c.set(x, surface - crest - 1, 'f');
  }

  // A small palm island on the right edge, the finish's landmark.
  const ix = cols - 12;
  for (let y = 0; y < 4; y++) {
    c.rect(ix - 6 + y * 2, surface - 1 - y, 22 - y * 4, 1, 's');
  }
  c.line(ix + 3, surface - 4, ix + 5, surface - 15, 'k');
  c.line(ix + 4, surface - 4, ix + 6, surface - 15, 'k');
  c.rect(ix - 3, surface - 17, 16, 2, 'a');
  c.rect(ix - 1, surface - 18, 12, 1, 'A');
  c.line(ix - 3, surface - 15, ix - 6, surface - 12, 'a');
  c.line(ix + 12, surface - 15, ix + 14, surface - 12, 'a');

  // A buoy for every step of the level, low enough to stay under the
  // title. Each wears a coloured cap; the last one carries the finish flag.
  const capColors = ['Y', 'R', 'B'];
  opts.markerXs.forEach((x, i) => {
    if (i === opts.markerXs.length - 1) {
      c.rect(x, surface - 11, 1, 9, 'O');
      c.rect(x + 1, surface - 12, 7, 6, 'O');
      for (let fy = 0; fy < 4; fy++) {
        for (let fx = 0; fx < 5; fx++) {
          c.set(x + 2 + fx, surface - 11 + fy, (fx + fy) % 2 ? 'O' : 'W');
        }
      }
    } else {
      c.rect(x - 2, surface - 6, 5, 4, 'O');
      c.rect(x - 1, surface - 5, 3, 2, capColors[i % capColors.length]);
    }
    // Round float, red with a white band, half under water.
    c.rect(x - 3, surface - 3, 7, 5, 'O');
    c.rect(x - 2, surface - 2, 5, 3, 'R');
    c.rect(x - 2, surface - 1, 5, 1, 'W');
  });

  // Sea floor: sand with a ripple line, rocks, coral and seaweed.
  c.rect(0, floor, cols, height - floor, 's');
  for (let x = 2; x < cols; x += 7) {
    c.rect(x, floor + 3, 3, 1, 'S');
  }
  for (let x = 4, i = 0; x < cols; x += 9 + Math.floor(rand() * 8), i++) {
    const kind = i % 3;
    if (kind === 0) {
      // Seaweed: a wavy strand.
      const h = 8 + Math.floor(rand() * 7);
      for (let y = 0; y < h; y++) {
        c.set(x + (Math.floor(y / 3) % 2), floor - 1 - y, y % 3 ? 'g' : 'G');
      }
    } else if (kind === 1) {
      // Rock.
      c.rect(x - 2, floor - 2, 6, 2, 'r');
      c.rect(x - 1, floor - 3, 4, 1, 'r');
    } else {
      // Branching coral.
      c.rect(x, floor - 5, 1, 5, 'p');
      c.rect(x - 2, floor - 4, 1, 3, 'P');
      c.rect(x + 2, floor - 6, 1, 4, 'p');
      c.rect(x - 1, floor - 2, 3, 1, 'p');
    }
  }

  // Bubbles rising through the water.
  for (let i = 0; i < Math.round(cols / 6); i++) {
    const x = Math.floor(rand() * cols);
    const y = surface + 3 + Math.floor(rand() * (floor - surface - 8));
    c.set(x, y, 'o');
    if (i % 3 === 0) {
      c.set(x + 1, y - 2, 'o');
    }
  }

  return { rows: c.rows(), surface };
}
