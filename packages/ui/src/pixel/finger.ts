/**
 * Close-up of one finger, palm side, drawn in code for the finger map.
 *
 * The finger stands upright with the tip at the top. The picture is cut
 * into equal slots from the tip down into the palm, one slot per part, so
 * rows of the same height beside it line up with the parts. A thumb has one
 * segment fewer.
 *
 * Keys: O outline, S skin, s crease, T pulley or tendon, K a marked spot,
 * k a crease inside a marked spot.
 */
import { PixelCanvas } from './raster';

export type FingerLayer = 'segments' | 'pulleys' | 'tendon';

/** Parts from the tip down, named as in @hackyeah/core's spots. */
export type FingerPart =
  | 'tip'
  | 'endJoint'
  | 'middle'
  | 'middleJoint'
  | 'base'
  | 'knuckle'
  | 'palm';

const FINGER_PARTS: readonly FingerPart[] = [
  'tip',
  'endJoint',
  'middle',
  'middleJoint',
  'base',
  'knuckle',
  'palm',
];
const THUMB_PARTS: readonly FingerPart[] = [
  'tip',
  'endJoint',
  'base',
  'knuckle',
  'palm',
];
const JOINTS: readonly FingerPart[] = ['endJoint', 'middleJoint', 'knuckle'];

/** Height of one part in art pixels. At scale 6 a part is a 48px row. */
export const FINGER_SLOT = 8;
/** Width of the picture in art pixels. */
export const FINGER_WIDTH = 14;
/** The picture is symmetric around this line, between columns 6 and 7. */
const MIDDLE = 6.5;

export const FINGER_COLORS: Readonly<Record<string, string>> = {
  O: '#22180F', // outline
  S: '#F2C29B', // skin
  s: '#D99C72', // crease
  T: '#BFD3DE', // pulley, tendon
  K: '#C93A27', // marked
  k: '#8F2618', // crease inside a marked spot
};

export function fingerParts(thumb: boolean): readonly FingerPart[] {
  return thumb ? THUMB_PARTS : FINGER_PARTS;
}

/** Where a part, or a run of parts, sits in the picture, in art pixels. */
export function partSpan(
  thumb: boolean,
  at: FingerPart,
  to: FingerPart = at,
): { top: number; height: number } {
  const parts = fingerParts(thumb);
  const first = parts.indexOf(at);
  const last = parts.indexOf(to);
  return { top: first * FINGER_SLOT, height: (last - first + 1) * FINGER_SLOT };
}

/** One spot of the layer on show: where it is and whether it is marked. */
export type FingerMark = Readonly<{
  at: FingerPart;
  to?: FingerPart;
  marked: boolean;
}>;

/**
 * The picture for one layer. Segments only paint marked parts red, pulleys
 * are bands across the finger and the tendon is a band down the middle.
 */
export function fingerRows(
  thumb: boolean,
  layer: FingerLayer,
  marks: readonly FingerMark[],
): string[] {
  const c = new PixelCanvas(
    FINGER_WIDTH,
    fingerParts(thumb).length * FINGER_SLOT,
  );
  drawFinger(c, thumb);
  for (const mark of marks) {
    const { top, height } = partSpan(thumb, mark.at, mark.to);
    if (layer === 'segments') {
      if (mark.marked) {
        paintSkin(c, top, height);
      }
    } else if (layer === 'pulleys') {
      // The thumb's pulley on the base segment runs at a slant.
      const slant = thumb && mark.at === 'base';
      drawPulley(c, top, JOINTS.includes(mark.at), slant, mark.marked);
    } else {
      drawTendon(c, top, height, mark.marked);
    }
  }
  return c.rows();
}

/** Rows with a crease: the middle of each joint's slot. */
function creaseRows(thumb: boolean): number[] {
  const parts = fingerParts(thumb);
  return JOINTS.filter(joint => parts.includes(joint)).flatMap(joint => {
    const y = parts.indexOf(joint) * FINGER_SLOT + 3;
    // The middle joint has a double crease.
    return joint === 'middleJoint' ? [y, y + 1] : [y];
  });
}

function drawFinger(c: PixelCanvas, thumb: boolean) {
  const creases = creaseRows(thumb);
  const palmTop = c.height - FINGER_SLOT;
  const body = thumb ? 6 : 5; // half the width of the straight part
  for (let y = 0; y < c.height; y++) {
    let half = body;
    if (y < 2) {
      half = body - 2 + y; // rounded tip
    } else if (y > palmTop - 4) {
      half = body + y - (palmTop - 4); // flares out into the palm
    } else if (creases.includes(y)) {
      half = body - 1; // the skin folds in a little at each crease
    }
    const left = Math.ceil(MIDDLE - half);
    const right = Math.floor(MIDDLE + half);
    for (let x = left; x <= right; x++) {
      const edge = y === 0 || x === left || x === right;
      c.set(x, y, edge ? 'O' : 'S');
    }
  }
  // Finger creases, plus one palm crease near the bottom.
  for (const y of [...creases, c.height - 3]) {
    for (let x = 0; x < c.width; x++) {
      if (c.get(x, y) === 'S') {
        c.set(x, y, 's');
      }
    }
  }
}

/** Paints the skin and creases of rows top..top+height red. */
function paintSkin(c: PixelCanvas, top: number, height: number) {
  for (let y = top; y < top + height; y++) {
    for (let x = 0; x < c.width; x++) {
      const key = c.get(x, y);
      if (key === 'S' || key === 's') {
        c.set(x, y, key === 'S' ? 'K' : 'k');
      }
    }
  }
}

/** A pulley: a band across the finger, thin at a joint, wide on a segment. */
function drawPulley(
  c: PixelCanvas,
  top: number,
  thin: boolean,
  slant: boolean,
  marked: boolean,
) {
  const first = top + (thin ? 3 : 2);
  const rows = thin ? 2 : 4;
  for (let x = 0; x < c.width; x++) {
    // A slanted band steps down one row every four columns.
    const y0 = slant ? first + Math.floor(x / 4) - 1 : first;
    for (let y = y0; y < y0 + rows; y++) {
      const key = c.get(x, y);
      if (key === 'S' || key === 's') {
        c.set(x, y, marked ? 'K' : 'T');
      }
    }
  }
}

/** The tendon: a band down the middle, from just below the tip. */
function drawTendon(
  c: PixelCanvas,
  top: number,
  height: number,
  marked: boolean,
) {
  const start = 4;
  for (let y = Math.max(top, start); y < top + height; y++) {
    // Two columns wide at its rounded top end, four below it.
    const [x0, x1] = y === start ? [6, 7] : [5, 8];
    for (let x = x0; x <= x1; x++) {
      c.set(x, y, marked ? 'K' : 'T');
    }
  }
}
