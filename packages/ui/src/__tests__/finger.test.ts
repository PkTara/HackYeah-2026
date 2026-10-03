import {
  FINGER_COLORS,
  FINGER_SLOT,
  FINGER_WIDTH,
  fingerParts,
  fingerRows,
  partSpan,
  type FingerLayer,
  type FingerMark,
  type FingerPart,
} from '../pixel/finger';
import { mirror } from '../pixel/raster';

const LAYERS: readonly FingerLayer[] = ['segments', 'pulleys', 'tendon'];
const DIGITS = [
  { label: 'finger', thumb: false },
  { label: 'thumb', thumb: true },
] as const;

/** The spots the app passes in, as in @hackyeah/core's spots. */
function spotsOf(thumb: boolean, layer: FingerLayer): FingerMark[] {
  const at = (part: FingerPart, to?: FingerPart) => ({
    at: part,
    to,
    marked: false,
  });
  if (layer === 'segments') {
    return fingerParts(thumb)
      .filter(p => p !== 'palm')
      .map(p => at(p));
  }
  if (layer === 'pulleys') {
    return thumb
      ? [at('knuckle'), at('base'), at('endJoint')]
      : [
          at('knuckle'),
          at('base'),
          at('middleJoint'),
          at('middle'),
          at('endJoint'),
        ];
  }
  return thumb ? [at('tip', 'palm')] : [at('tip', 'knuckle'), at('palm')];
}

/** Positions of pixels with one of these keys. */
function find(
  rows: readonly string[],
  keys: string,
): { x: number; y: number }[] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((k, x) => (keys.includes(k) ? [{ x, y }] : [])),
  );
}

describe.each(DIGITS)('the $label close-up', ({ thumb }) => {
  const height = fingerParts(thumb).length * FINGER_SLOT;

  it.each(LAYERS)(
    'draws the %s layer at the full size with known colours',
    layer => {
      const rows = fingerRows(thumb, layer, spotsOf(thumb, layer));
      expect(rows).toHaveLength(height);
      expect(rows.filter(row => row.length !== FINGER_WIDTH)).toEqual([]);
      const unknown = [...new Set(rows.join(''))].filter(
        k => k !== '.' && !(k in FINGER_COLORS),
      );
      expect(unknown).toEqual([]);
    },
  );

  it('cuts the picture into one slot per part, tip to palm, with no gaps', () => {
    let next = 0;
    for (const part of fingerParts(thumb)) {
      const span = partSpan(thumb, part);
      expect(span).toEqual({ top: next, height: FINGER_SLOT });
      next += FINGER_SLOT;
    }
    expect(next).toBe(height);
  });

  it('is symmetric before anything is marked', () => {
    const plain = fingerRows(thumb, 'segments', spotsOf(thumb, 'segments'));
    expect(mirror(plain)).toEqual(plain);
  });

  it('paints a marked segment red inside its own rows only', () => {
    const plain = fingerRows(thumb, 'segments', spotsOf(thumb, 'segments'));
    expect(find(plain, 'Kk')).toEqual([]);

    const marks = spotsOf(thumb, 'segments').map(m => ({
      ...m,
      marked: m.at === 'endJoint',
    }));
    const red = find(fingerRows(thumb, 'segments', marks), 'Kk');
    const { top, height: h } = partSpan(thumb, 'endJoint');
    expect(red.length).toBeGreaterThan(0);
    expect(red.filter(p => p.y < top || p.y >= top + h)).toEqual([]);
  });

  it('draws every pulley as a band inside its part, red when marked', () => {
    for (const spot of spotsOf(thumb, 'pulleys')) {
      const { top, height: h } = partSpan(thumb, spot.at);
      const inPart = (p: { y: number }) => p.y >= top && p.y < top + h;
      const plain = fingerRows(thumb, 'pulleys', [spot]);
      const marked = fingerRows(thumb, 'pulleys', [{ ...spot, marked: true }]);
      expect(find(plain, 'T').filter(inPart).length).toBeGreaterThan(0);
      expect(find(plain, 'T').filter(p => !inPart(p))).toEqual([]);
      expect(find(marked, 'K')).toEqual(find(plain, 'T'));
    }
  });

  it('runs the tendon down the middle from below the tip to the bottom', () => {
    const rows = fingerRows(thumb, 'tendon', spotsOf(thumb, 'tendon'));
    const gaps = rows
      .map((row, y) => ({ y, middle: row.slice(6, 8) }))
      .filter(({ y, middle }) => y >= 4 && middle !== 'TT');
    expect(gaps).toEqual([]);
    expect(rows.slice(0, 4).join('')).not.toContain('T');
  });

  it('keeps the outline when a band crosses the finger', () => {
    const outline = (layer: FingerLayer) =>
      find(fingerRows(thumb, layer, spotsOf(thumb, layer)), 'O');
    expect(outline('pulleys')).toEqual(outline('segments'));
    expect(outline('tendon')).toEqual(outline('segments'));
  });
});

describe('fingerParts', () => {
  it('gives a thumb every part of a finger except the middle segment and joint', () => {
    expect(
      fingerParts(false).filter(p => !fingerParts(true).includes(p)),
    ).toEqual(['middle', 'middleJoint']);
  });
});

describe('partSpan', () => {
  it('covers a run of parts from the first to the last', () => {
    expect(partSpan(false, 'tip', 'knuckle')).toEqual({
      top: 0,
      height: 6 * FINGER_SLOT,
    });
    expect(partSpan(true, 'tip', 'palm')).toEqual({
      top: 0,
      height: 5 * FINGER_SLOT,
    });
  });
});
