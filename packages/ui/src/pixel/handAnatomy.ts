/**
 * A palm-view hand for the anatomy viewer, drawn in code. Each layer
 * (skeleton, muscle, tendon) gives a picture and a region grid of the same
 * size. A region cell holds the id of the part drawn there (ids from
 * @hackyeah/core's anatomy.ts) or '.', so a tap can be turned into an art
 * pixel and looked up: pixel picking.
 *
 * The left hand is drawn, palm towards you and fingers up, so its thumb is
 * on the left as on the Hands screen. The right hand is the mirror image.
 *
 * Fingers stand straight up, so their parts are rows. The thumb is angled,
 * so its parts are drawn along an axis with capsule(). The wrist bones are
 * irregular, so they are pixel art in WRIST below.
 *
 * Keys: h hand, e hand edge, g faint bone (muscle and tendon layers),
 * B bone, b bone shade, J joint, M muscle, N deep muscle, m muscle rim,
 * n muscle fibre, T deep tendon (FDP, FPL), t shallow tendon (FDS),
 * q tendon in the forearm, P pulley, p pulley rim, Y y selected.
 */
import type { AnatomyLayer, Side } from '@hackyeah/core';
import { art, mirror } from './raster';

export const HAND_ANATOMY_WIDTH = 56;
export const HAND_ANATOMY_HEIGHT = 74;

export const ANATOMY_COLORS: Readonly<Record<string, string>> = {
  h: '#243630', // hand
  e: '#46655A', // hand edge
  g: '#3A544B', // faint bone under muscles and tendons
  B: '#F1E7CE', // bone
  b: '#BBA57A', // bone shade
  J: '#79A3B8', // joint
  M: '#C9503F', // muscle
  N: '#A23E31', // deep muscle
  m: '#6E2219', // muscle rim
  n: '#B9473A', // muscle fibre
  T: '#F6EEDC', // deep flexor tendon (FDP, FPL)
  t: '#D4B98A', // shallow flexor tendon (FDS)
  q: '#5F7A6F', // tendons in the forearm
  P: '#8DBBD2', // pulley, flexor retinaculum
  p: '#4E7F99', // pulley rim
  Y: '#FFD23F', // selected
  y: '#D9A300', // selected shade
};

/** Selected parts swap each key for a banana one. */
const SELECTED: Readonly<Record<string, string>> = {
  B: 'Y',
  b: 'y',
  J: 'Y',
  M: 'Y',
  N: 'Y',
  m: 'y',
  n: 'Y',
  T: 'Y',
  t: 'Y',
  P: 'Y',
  p: 'y',
};

export type HandAnatomyPicture = Readonly<{
  /** Pixel rows, keys from ANATOMY_COLORS. */
  rows: readonly string[];
  /** Same size as rows: the id of the part in each cell, or '.'. */
  regions: readonly (readonly string[])[];
}>;

type Pt = readonly [number, number];

// Geometry, in art pixels of the left hand -----------------------------------

type LongFinger = 'index' | 'middle' | 'ring' | 'little';

/**
 * One finger, standing straight up at column x. Rows count from the top:
 * p3 is the distal phalanx, p2 the middle and p1 the proximal one, each
 * [top, bottom]. Joints sit in the one-row gaps between them. The
 * metacarpal runs from its head under the knuckle down to its base at the
 * wrist, leaning in towards the middle of the hand.
 */
type Ray = Readonly<{
  finger: LongFinger;
  x: number;
  p3: readonly [number, number];
  p2: readonly [number, number];
  p1: readonly [number, number];
  /** Top row of the metacarpal head. */
  head: number;
  /** Bottom point of the metacarpal base. */
  base: Pt;
  /** Column where its flexor tendons leave the carpal tunnel. */
  tunnel: number;
}>;

// prettier-ignore
const RAYS: readonly Ray[] = [
  { finger: 'index', x: 24, p3: [7, 11], p2: [13, 19], p1: [21, 32], head: 34, base: [27, 53], tunnel: 28 },
  { finger: 'middle', x: 32, p3: [3, 8], p2: [10, 17], p1: [19, 31], head: 33, base: [32, 51], tunnel: 31 },
  { finger: 'ring', x: 40, p3: [6, 11], p2: [13, 20], p1: [22, 33], head: 35, base: [37, 51], tunnel: 34 },
  { finger: 'little', x: 48, p3: [14, 18], p2: [20, 25], p1: [27, 36], head: 38, base: [42, 51], tunnel: 37 },
];

/** The thumb: three bones along an axis that bends a little at each joint. */
const THUMB = (() => {
  const dir = (deg: number): Pt => {
    const r = (deg * Math.PI) / 180;
    return [-Math.sin(r), -Math.cos(r)];
  };
  const GAP = 1.7;
  const d1 = dir(43); // metacarpal
  const d2 = dir(33); // proximal phalanx
  const d3 = dir(23); // distal phalanx
  const mcBase: Pt = [20.4, 52.4];
  const mcHead = point(mcBase, d1, 12);
  const p1Base = point(mcHead, d1, GAP);
  const p1Head = point(p1Base, d2, 8.4);
  const p2Base = point(p1Head, d2, GAP);
  const tip = point(p2Base, d3, 5.4);
  return { d1, d2, d3, mcBase, mcHead, p1Base, p1Head, p2Base, tip };
})();

/**
 * The wrist bones and the ends of the forearm bones as pixel art, placed
 * at column WRIST_X and row WRIST_Y: M trapezium, Z trapezoid, C capitate,
 * H hamate (distal row); S scaphoid, L lunate, T triquetrum, P pisiform
 * (proximal row, the pisiform on the palm side of the triquetrum); R radius
 * and U ulna. The radius reaches further down the thumb side (its styloid),
 * and a gap for the TFCC is left between the ulna and the triquetrum.
 */
const WRIST_X = 17;
const WRIST_Y = 53;
const WRIST = art(`
  .............CCCCC.HHHHHHHH..
  .............CCCCC.HHHHHHHH..
  ...MMMM.ZZZZ.CCCCC.HHHHHHH...
  ..MMMMM.ZZZZ.CCCCC.HHHHHH....
  ..MMMMM..ZZZ.CCCCC.HHHHH.....
  ...MMM........CCCC.HHHH......
  ..............CCC.......PP...
  ...SSSSS......CCC...TTTTPPP..
  ....SSSSSS.........TTTTTPPP..
  .R...SSSSSS.LLLLLL.TTTT.PP...
  .R....SSSSS.LLLLLL.TTT.......
  .RR....SSSS..LLLL............
  .RRRRR.................U.....
  .RRRRRRRRR.............UU....
  .RRRRRRRRRRRRRRR..UUUUUUU....
  .RRRRRRRRRRRRRRR..UUUUUUU....
  .RRRRRRRRRRRRRRR..UUUUUU.....
  ..RRRRRRRRRRRRR...UUUUU......
  ...RRRRRRRRRRR....UUUU.......
  ...RRRRRRRRRRR....UUUU.......
  ...RRRRRRRRRRR....UUUU.......
`);
const WRIST_BONES: Readonly<Record<string, string>> = {
  M: 'trapezium',
  Z: 'trapezoid',
  C: 'capitate',
  H: 'hamate',
  S: 'scaphoid',
  L: 'lunate',
  T: 'triquetrum',
  P: 'pisiform',
  R: 'radius',
  U: 'ulna',
};

/** Outline of the palm and wrist; fingers and thumb are added to it. */
const PALM: readonly Pt[] = [
  [21, 31],
  [28, 28],
  [36, 29],
  [44, 31],
  [51, 34],
  [52.5, 40],
  [53, 48],
  [51, 55],
  [47, 60],
  [43, 63],
  [43, 73],
  [18, 73],
  [18, 63],
  [14.5, 59],
  [11, 54],
  [9, 48.5],
  [15.5, 41.5],
  [21, 35],
];

// Drawing --------------------------------------------------------------------

function point(a: Pt, d: Pt, n: number): Pt {
  return [a[0] + d[0] * n, a[1] + d[1] * n];
}

/** Unit vector across the axis d, towards the thumb side of a left hand. */
function across(d: Pt): Pt {
  return [d[1], -d[0]];
}

/** A set of pixels that knows which of them lie on its edges. */
class Cells {
  readonly list: Pt[] = [];
  private readonly set = new Set<string>();

  add(x: number, y: number) {
    const k = `${x},${y}`;
    if (!this.set.has(k)) {
      this.set.add(k);
      this.list.push([x, y]);
    }
  }

  has(x: number, y: number): boolean {
    return this.set.has(`${x},${y}`);
  }

  /** On any edge. */
  isRim(x: number, y: number): boolean {
    return this.isShade(x, y) || !this.has(x - 1, y) || !this.has(x, y - 1);
  }

  /** On the right or bottom edge, away from the light. */
  isShade(x: number, y: number): boolean {
    return !this.has(x + 1, y) || !this.has(x, y + 1);
  }
}

/**
 * Two grids drawn together: the colour key of each pixel and the part that
 * owns it. Selection is applied at the end, so a part that takes pixels
 * over from another (a joint over the bone ends) highlights correctly.
 */
class Painter {
  readonly keys = grid('.');
  readonly owners = grid('.');

  /** Draws one pixel. Without an id it is decoration, owned by nobody. */
  plot(x: number, y: number, key: string, id?: string) {
    if (x < 0 || y < 0 || x >= HAND_ANATOMY_WIDTH || y >= HAND_ANATOMY_HEIGHT) {
      return;
    }
    this.keys[y][x] = key;
    this.owners[y][x] = id ?? '.';
  }

  /** Fills a shape, giving its edge pixels the `rim` key. */
  fill(cells: Cells, key: string, rim: string, id?: string) {
    for (const [x, y] of cells.list) {
      this.plot(x, y, cells.isRim(x, y) ? rim : key, id);
    }
  }

  /** Fills a bone: lit on the top and left, shaded on the right and bottom. */
  bone(cells: Cells, id?: string) {
    for (const [x, y] of cells.list) {
      this.plot(x, y, cells.isShade(x, y) ? 'b' : 'B', id);
    }
  }

  picture(selected: string | null): HandAnatomyPicture {
    const rows = this.keys.map((row, y) =>
      row
        .map((key, x) =>
          selected !== null && this.owners[y][x] === selected
            ? SELECTED[key] ?? key
            : key,
        )
        .join(''),
    );
    return { rows, regions: this.owners.map(row => [...row]) };
  }
}

function grid(fill: string): string[][] {
  return Array.from({ length: HAND_ANATOMY_HEIGHT }, () =>
    new Array<string>(HAND_ANATOMY_WIDTH).fill(fill),
  );
}

/**
 * Pixels within `half(t)` of the segment from a to b, where t runs from 0
 * at a to 1 at b. Bones, tendons, muscles and bands are drawn this way.
 */
function capsule(a: Pt, b: Pt, half: number | ((t: number) => number)): Cells {
  const width = typeof half === 'number' ? () => half : half;
  const cells = new Cells();
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1;
  const len = Math.sqrt(len2);
  const reach = 6;
  // Half a pixel of slack along the axis keeps both end rows.
  const slack = 0.5 / len;
  for (let y = Math.floor(Math.min(a[1], b[1]) - reach); y <= Math.max(a[1], b[1]) + reach; y++) {
    for (let x = Math.floor(Math.min(a[0], b[0]) - reach); x <= Math.max(a[0], b[0]) + reach; x++) {
      const px = x - a[0];
      const py = y - a[1];
      const t = (px * dx + py * dy) / len2;
      if (t < -slack || t > 1 + slack) {
        continue;
      }
      const dist = Math.abs(px * dy - py * dx) / len;
      if (dist <= width(Math.min(1, Math.max(0, t))) + 0.01) {
        cells.add(x, y);
      }
    }
  }
  return cells;
}

/** Pixels whose centres are inside a polygon (even-odd rule). */
function polygon(points: readonly Pt[]): Cells {
  const cells = new Cells();
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
      let hit = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          hit = !hit;
        }
      }
      if (hit) {
        cells.add(x, y);
      }
    }
  }
  return cells;
}

function union(...parts: Cells[]): Cells {
  const out = new Cells();
  parts.forEach(p => p.list.forEach(([x, y]) => out.add(x, y)));
  return out;
}

/** Bone width along its length: flared base, slim shaft, flared head. */
function boneShape(len: number, base: number, shaft: number, head: number) {
  const baseEnd = Math.min(0.4, 1.2 / len);
  const headStart = Math.max(0.6, 1 - 1.2 / len);
  return (t: number) => (t <= baseEnd ? base : t >= headStart ? head : shaft);
}

/** A finger bone from its bottom row to its top row at column x. */
function fingerBone(x: number, [top, bottom]: readonly [number, number], tip = false) {
  return capsule([x, bottom], [x, top], boneShape(bottom - top || 1, 2, 1, tip ? 1 : 2));
}

// The hand and its bones -----------------------------------------------------

function hand(): Cells {
  const fingers = RAYS.map(r =>
    capsule([r.x, r.head], [r.x, r.p3[0] - 2], t => (t > 0.97 ? 2 : 3)),
  );
  const t = THUMB;
  const thumb = union(
    capsule(t.mcBase, t.mcHead, 4.6),
    capsule(t.mcHead, t.p1Head, 3.9),
    capsule(t.p1Head, point(t.tip, t.d3, 1.4), u => (u > 0.86 ? 2.6 : 3.5)),
  );
  return union(polygon(PALM), thumb, ...fingers);
}

type Part = { id: string; cells: Cells };

/** Every bone of the hand and the ends of the forearm bones. */
function bones(): Part[] {
  const out: Part[] = [];
  for (const r of RAYS) {
    const f = r.finger;
    out.push({ id: `${f}-distal`, cells: fingerBone(r.x, r.p3, true) });
    out.push({ id: `${f}-middle`, cells: fingerBone(r.x, r.p2) });
    out.push({ id: `${f}-proximal`, cells: fingerBone(r.x, r.p1) });
    const head: Pt = [r.x, r.head];
    const len = Math.hypot(r.base[0] - head[0], r.base[1] - head[1]);
    out.push({
      id: `${f}-metacarpal`,
      cells: capsule(r.base, head, boneShape(len, 1.7, 1.25, 2.1)),
    });
  }
  const t = THUMB;
  out.push({ id: 'thumb-metacarpal', cells: capsule(t.mcBase, t.mcHead, boneShape(12, 2.3, 1.6, 2.3)) });
  out.push({ id: 'thumb-proximal', cells: capsule(t.p1Base, t.p1Head, boneShape(8.4, 2.2, 1.5, 2)) });
  out.push({ id: 'thumb-distal', cells: capsule(t.p2Base, t.tip, boneShape(5.4, 2, 1.3, 1.6)) });
  const wrist = new Map<string, Cells>();
  WRIST.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      const id = WRIST_BONES[ch];
      if (id) {
        const cells = wrist.get(id) ?? new Cells();
        cells.add(WRIST_X + dx, WRIST_Y + dy);
        wrist.set(id, cells);
      }
    }),
  );
  wrist.forEach((cells, id) => out.push({ id, cells }));
  return out;
}

/** Joints: from the end of one bone to the start of the next. */
function joints(): { id: string; from: Pt; to: Pt; half: number }[] {
  const out: { id: string; from: Pt; to: Pt; half: number }[] = [];
  for (const r of RAYS) {
    const f = r.finger;
    out.push({ id: `${f}-dip`, from: [r.x, r.p2[0]], to: [r.x, r.p3[1]], half: 2 });
    out.push({ id: `${f}-pip`, from: [r.x, r.p1[0]], to: [r.x, r.p2[1]], half: 2 });
    out.push({ id: `${f}-mcp`, from: [r.x, r.head], to: [r.x, r.p1[1]], half: 2 });
  }
  const t = THUMB;
  out.push({ id: 'thumb-ip', from: point(t.p1Head, t.d2, -0.4), to: point(t.p2Base, t.d3, 0.4), half: 2.2 });
  out.push({ id: 'thumb-mcp', from: point(t.mcHead, t.d1, -0.4), to: point(t.p1Base, t.d2, 0.4), half: 2.4 });
  return out;
}

function drawSkeleton(p: Painter) {
  for (const bone of bones()) {
    p.bone(bone.cells, bone.id);
  }
  // A joint is the gap between two bones plus one pixel of each bone end,
  // so it is big enough to tap. The gap itself is drawn in the joint colour.
  for (const j of joints()) {
    for (const [x, y] of capsule(j.from, j.to, j.half).list) {
      const key = p.keys[y]?.[x];
      if (key === 'B' || key === 'b') {
        p.plot(x, y, key, j.id);
      } else if (key !== undefined && key !== '.') {
        p.plot(x, y, 'J', j.id);
      }
    }
  }
}

function drawFaintBones(p: Painter) {
  for (const bone of bones()) {
    p.fill(bone.cells, 'g', 'g');
  }
}

// Muscle layer ---------------------------------------------------------------

/**
 * Fills a muscle with fibre streaks that run along `dir`. Deep muscles,
 * which lie under others, are a darker red.
 */
function drawMuscle(p: Painter, cells: Cells, id: string, dir: Pt, deep = false) {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  for (const [x, y] of cells.list) {
    const offset = Math.round((x * dir[1] - y * dir[0]) / len);
    const key = cells.isRim(x, y) ? 'm' : offset % 3 === 0 ? 'n' : deep ? 'N' : 'M';
    p.plot(x, y, key, id);
  }
}

/** A muscle shaped like a spindle from a to b, widest in the middle. */
function belly(a: Pt, b: Pt, ends: number, middle: number): Cells {
  return capsule(a, b, u => ends + (middle - ends) * Math.sin(u * Math.PI));
}

const along = (a: Pt, b: Pt): Pt => [b[0] - a[0], b[1] - a[1]];

/** A point on a finger's flexor tendons in the palm: 0 at the tunnel. */
function tendonAt(r: Ray, share: number): Pt {
  const from: Pt = [r.tunnel, 54];
  const to: Pt = [r.x, r.head];
  return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
}

function drawMuscles(p: Painter) {
  drawFaintBones(p);
  const t = THUMB;
  const up: Pt = [0, -1];

  // Forearm: the bellies of the long finger flexors.
  drawMuscle(p, polygon([[19.5, 63.5], [41.5, 63.5], [42.5, 73], [18.5, 73]]), 'forearm-flexors', up);

  // Interossei fill the spaces between the metacarpals.
  const interossei = union(
    polygon([[25.6, 36.5], [30.4, 35.5], [30.4, 50.5], [28.4, 52.5]]),
    polygon([[33.6, 35.5], [38.4, 37], [35.6, 51.5], [33.6, 51.5]]),
    polygon([[41.6, 38.5], [46.4, 40], [40.6, 51.5], [38.6, 51]]),
  );
  drawMuscle(p, interossei, 'interossei', up, true);

  // Adductor: a fan from the third metacarpal to the base of the thumb.
  const apex = point(point(t.p1Base, across(t.d2), -1.8), t.d2, 0.6);
  drawMuscle(p, polygon([apex, [30.4, 37], [30.4, 49.5], [28, 54.5]]), 'adductor-pollicis', [1, 0.2], true);

  // Thumb pad: the opponens deepest, along the metacarpal; the abductor on
  // the outer side and the short flexor on the inner side, on top.
  const out = across(t.d1);
  const opFrom = point([21, 57], out, 1.8);
  const opTo = point(t.mcHead, out, 2.8);
  drawMuscle(p, belly(opFrom, opTo, 1.4, 2.4), 'opponens-pollicis', along(opFrom, opTo), true);
  const apbFrom: Pt = [21.6, 58.6];
  const apbTo = point(point(t.p1Base, out, 1.3), t.d2, 0.8);
  drawMuscle(p, belly(apbFrom, apbTo, 1.4, 2.9), 'abductor-pollicis-brevis', along(apbFrom, apbTo));
  const fpbFrom: Pt = [25.4, 58.4];
  const fpbTo = point(point(t.p1Base, out, -1.5), t.d2, 0.4);
  drawMuscle(p, belly(fpbFrom, fpbTo, 1.3, 2.6), 'flexor-pollicis-brevis', along(fpbFrom, fpbTo));

  // Little finger side: the opponens deepest along the fifth metacarpal,
  // then the short flexor and the abductor on the outer edge.
  const odmFrom: Pt = [41, 57.6];
  const odmTo: Pt = [47.2, 42.6];
  drawMuscle(p, belly(odmFrom, odmTo, 1.4, 2.4), 'opponens-digiti-minimi', along(odmFrom, odmTo), true);
  const fdmFrom: Pt = [40.4, 58.6];
  const fdmTo: Pt = [47, 38.6];
  drawMuscle(p, belly(fdmFrom, fdmTo, 1.1, 1.9), 'flexor-digiti-minimi-brevis', along(fdmFrom, fdmTo));
  const admFrom: Pt = [43, 61.4];
  const admTo: Pt = [50.4, 39];
  drawMuscle(p, belly(admFrom, admTo, 1.4, 2.4), 'abductor-digiti-minimi', along(admFrom, admTo));

  // Lumbricals: from the deep flexor tendons in mid palm along the thumb
  // side of each finger's tendons to its knuckle.
  for (const r of RAYS) {
    const from = point(tendonAt(r, 0.34), [-1, 0], 1.6);
    const to: Pt = [r.x - 2.4, r.head + 1.2];
    drawMuscle(p, belly(from, to, 1, 1.9), `${r.finger}-lumbrical`, along(from, to));
  }
}

// Tendon layer ---------------------------------------------------------------

/** A pulley: a band across a straight finger, inside its edges. */
function drawBand(p: Painter, x: number, top: number, rows: number, id: string) {
  for (let y = top; y < top + rows; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      const edge = rows > 1 && (y === top || y === top + rows - 1);
      p.plot(x + dx, y, edge && Math.abs(dx) < 2 ? 'p' : 'P', id);
    }
  }
}

/** A pulley across the thumb, from one side of the axis to the other. */
function drawThumbBand(p: Pt, q: Pt, half: number, id: string, painter: Painter) {
  painter.fill(capsule(p, q, half), 'P', 'p', id);
}

function drawTendons(p: Painter) {
  drawFaintBones(p);
  const t = THUMB;

  // In the forearm the tendons run side by side into the carpal tunnel.
  for (const x of [25, ...RAYS.map(r => r.tunnel)]) {
    for (let y = 60; y < HAND_ANATOMY_HEIGHT; y++) {
      p.plot(x, y, 'q');
    }
  }

  for (const r of RAYS) {
    const f = r.finger;
    const mcp = r.head - 1;
    const pip = r.p2[1] + 1;
    const dip = r.p3[1] + 1;
    const a2 = a2Span(r);
    const p2Mid = Math.round((r.p2[0] + r.p2[1]) / 2);

    // In the palm both tendons run as one bundle, the FDS on top.
    p.fill(capsule([r.tunnel, 59], [r.x, r.head], 1), 't', 't', `${f}-flexor-palm`);
    // In the finger the FDS still covers the FDP, then splits in two to let
    // it through and ends on the middle phalanx. The FDP runs on to the
    // base of the distal phalanx.
    const split = a2.top - 1;
    p.fill(capsule([r.x, r.head - 1], [r.x, split], 1), 't', 't', `${f}-fds`);
    for (const side of [-2, 2]) {
      p.fill(capsule([r.x + side, split - 1], [r.x + side, p2Mid], 0), 't', 't', `${f}-fds`);
    }
    p.fill(capsule([r.x, split - 1], [r.x, r.p3[1]], 1), 'T', 'T', `${f}-fdp`);

    // Pulleys: A1 over the knuckle, A2 on the proximal phalanx, A3 over the
    // middle joint, A4 on the middle phalanx, A5 over the end joint.
    drawBand(p, r.x, mcp - 1, 2, `${f}-a1`);
    drawBand(p, r.x, a2.top, a2.rows, `${f}-a2`);
    drawBand(p, r.x, pip, 1, `${f}-a3`);
    drawBand(p, r.x, p2Mid - 1, 2, `${f}-a4`);
    drawBand(p, r.x, dip, 1, `${f}-a5`);
  }

  // Thumb: the FPL runs from the tunnel to the base of the distal phalanx.
  const fpl = union(
    capsule([25, 59], t.mcHead, 1),
    capsule(t.mcHead, t.p1Head, 1),
    capsule(t.p1Head, point(t.p2Base, t.d3, 0.8), 1),
  );
  p.fill(fpl, 'T', 'T', 'thumb-fpl');
  const ac1 = across(t.d1);
  const ac2 = across(t.d2);
  const mcp = point(t.mcHead, t.d1, 0.9);
  drawThumbBand(point(mcp, ac1, -2.2), point(mcp, ac1, 2.2), 0.8, 'thumb-a1', p);
  // The oblique pulley slants across the proximal phalanx, from the inner
  // side near its base to the outer side further up.
  drawThumbBand(
    point(point(t.p1Base, t.d2, 2.6), ac2, -2.3),
    point(point(t.p1Base, t.d2, 5.4), ac2, 2.3),
    0.8,
    'thumb-oblique',
    p,
  );
  const ip = point(t.p1Head, t.d2, 0.7);
  drawThumbBand(point(ip, ac2, -2), point(ip, ac2, 2), 0.5, 'thumb-a2', p);

  // Carpal tunnel: the flexor retinaculum is its roof across the wrist.
  p.fill(polygon([[21.5, 54.5], [42.5, 54.5], [42.5, 58.5], [21.5, 58.5]]), 'P', 'p', 'carpal-tunnel');
}

/** The A2 pulley covers the lower middle of the proximal phalanx. */
function a2Span(r: Ray): { top: number; rows: number } {
  const rows = r.p1[1] - r.p1[0] >= 10 ? 4 : 3;
  return { top: r.p1[1] - 1 - rows, rows };
}

// Public API -----------------------------------------------------------------

const cache = new Map<string, HandAnatomyPicture>();

/**
 * The picture and region grid of one layer. `selected` is a part id; its
 * pixels are drawn in banana colours.
 */
export function handAnatomy(
  layer: AnatomyLayer,
  side: Side,
  selected: string | null = null,
): HandAnatomyPicture {
  const key = `${layer}:${side}:${selected ?? ''}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const p = new Painter();
  p.fill(hand(), 'h', 'e');
  if (layer === 'skeleton') {
    drawSkeleton(p);
  } else if (layer === 'muscle') {
    drawMuscles(p);
  } else {
    drawTendons(p);
  }
  const left = p.picture(selected);
  const picture: HandAnatomyPicture =
    side === 'left'
      ? left
      : {
          rows: mirror(left.rows),
          regions: left.regions.map(row => [...row].reverse()),
        };
  if (cache.size > 60) {
    cache.clear();
  }
  cache.set(key, picture);
  return picture;
}

/**
 * The part under art pixel (x, y). A miss looks up to `reach` pixels away
 * and takes the nearest part, so thin parts are easy to tap.
 */
export function pickPart(
  regions: readonly (readonly string[])[],
  x: number,
  y: number,
  reach = 2,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const id = regions[y + dy]?.[x + dx];
      const dist = dx * dx + dy * dy;
      if (id !== undefined && id !== '.' && dist < bestDist) {
        best = id;
        bestDist = dist;
      }
    }
  }
  return best;
}
