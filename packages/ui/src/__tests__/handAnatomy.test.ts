import {
  ANATOMY_LAYERS,
  anatomyById,
  anatomyIn,
  type AnatomyLayer,
} from '@hackyeah/core';
import {
  ANATOMY_COLORS,
  HAND_ANATOMY_HEIGHT,
  HAND_ANATOMY_WIDTH,
  handAnatomy,
  pickPart,
} from '../pixel/handAnatomy';
import { mirror } from '../pixel/raster';

const SIDES = ['left', 'right'] as const;
const LONG_FINGERS = ['index', 'middle', 'ring', 'little'] as const;

/** Every pixel of a part, as "x,y". */
function pixels(layer: AnatomyLayer, id: string, side: 'left' | 'right' = 'left') {
  const out = new Set<string>();
  handAnatomy(layer, side).regions.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell === id) {
        out.add(`${x},${y}`);
      }
    }),
  );
  return out;
}

function ys(layer: AnatomyLayer, id: string): number[] {
  return [...pixels(layer, id)].map(p => Number(p.split(',')[1]));
}

function top(layer: AnatomyLayer, id: string) {
  return Math.min(...ys(layer, id));
}

function bottom(layer: AnatomyLayer, id: string) {
  return Math.max(...ys(layer, id));
}

function meanX(layer: AnatomyLayer, id: string, side: 'left' | 'right' = 'left') {
  const xs = [...pixels(layer, id, side)].map(p => Number(p.split(',')[0]));
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function overlaps(a: Set<string>, b: Set<string>) {
  return [...a].some(p => b.has(p));
}

describe.each(ANATOMY_LAYERS)('the %s layer', layer => {
  it.each(SIDES)('has a picture and region grid of the same size (%s)', side => {
    const { rows, regions } = handAnatomy(layer, side);
    expect(rows).toHaveLength(HAND_ANATOMY_HEIGHT);
    expect(regions).toHaveLength(HAND_ANATOMY_HEIGHT);
    expect(rows.filter(r => r.length !== HAND_ANATOMY_WIDTH)).toEqual([]);
    expect(regions.filter(r => r.length !== HAND_ANATOMY_WIDTH)).toEqual([]);
  });

  it('only uses colours from the palette', () => {
    const keys = new Set(handAnatomy(layer, 'left').rows.join(''));
    expect([...keys].filter(k => k !== '.' && !(k in ANATOMY_COLORS))).toEqual(
      [],
    );
  });

  it('only names parts of this layer, and only where something is drawn', () => {
    const { rows, regions } = handAnatomy(layer, 'left');
    const wrong = new Set<string>();
    regions.forEach((row, y) =>
      row.forEach((id, x) => {
        if (id === '.') {
          return;
        }
        if (anatomyById(id)?.layer !== layer || rows[y][x] === '.') {
          wrong.add(id);
        }
      }),
    );
    expect([...wrong]).toEqual([]);
  });

  it('can reach every part of the layer by tapping a pixel', () => {
    const drawn = new Set(handAnatomy(layer, 'left').regions.flat());
    expect(
      anatomyIn(layer)
        .map(s => s.id)
        .filter(id => !drawn.has(id)),
    ).toEqual([]);
  });

  it('draws the right hand as the mirror image of the left', () => {
    const left = handAnatomy(layer, 'left');
    const right = handAnatomy(layer, 'right');
    expect(right.rows).toEqual(mirror(left.rows));
    expect(right.regions).toEqual(left.regions.map(row => [...row].reverse()));
  });

  it('paints a selected part in banana and leaves the rest alone', () => {
    const id = anatomyIn(layer)[0].id;
    const plain = handAnatomy(layer, 'left');
    const lit = handAnatomy(layer, 'left', id);
    expect(lit.regions).toEqual(plain.regions);
    const changed: string[] = [];
    plain.rows.forEach((row, y) =>
      [...row].forEach((key, x) => {
        if (lit.rows[y][x] !== key) {
          changed.push(`${x},${y}`);
        }
      }),
    );
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.filter(p => !pixels(layer, id).has(p))).toEqual([]);
    expect(
      changed.every(p => {
        const [x, y] = p.split(',').map(Number);
        return 'Yy'.includes(lit.rows[y][x]);
      }),
    ).toBe(true);
  });
});

describe('anatomy in the pictures', () => {
  it('puts the thumb on the outer side of each hand', () => {
    expect(meanX('skeleton', 'thumb-distal')).toBeLessThan(
      meanX('skeleton', 'little-distal'),
    );
    expect(meanX('skeleton', 'thumb-distal', 'right')).toBeGreaterThan(
      meanX('skeleton', 'little-distal', 'right'),
    );
  });

  it('orders the wrist bones from the thumb side', () => {
    const order = (ids: string[]) => ids.map(id => meanX('skeleton', id));
    const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
    const proximal = order(['scaphoid', 'lunate', 'triquetrum']);
    const distal = order(['trapezium', 'trapezoid', 'capitate', 'hamate']);
    const forearm = order(['radius', 'ulna']);
    expect(proximal).toEqual(sorted(proximal));
    expect(distal).toEqual(sorted(distal));
    expect(forearm).toEqual(sorted(forearm));
    // The distal row lies nearer the fingers than the proximal row.
    expect(top('skeleton', 'capitate')).toBeLessThan(top('skeleton', 'lunate'));
  });

  it.each(LONG_FINGERS)(
    'stacks the %s finger bones tip to palm with joints between them',
    finger => {
      const chain = [
        'distal',
        'dip',
        'middle',
        'pip',
        'proximal',
        'mcp',
        'metacarpal',
      ].map(part => `${finger}-${part}`);
      const tops = chain.map(id => top('skeleton', id));
      expect(tops).toEqual([...tops].sort((a, b) => a - b));
    },
  );

  it.each(LONG_FINGERS)(
    'ends the %s FDP on the distal phalanx and the FDS on the middle one',
    finger => {
      const fdpTop = top('tendon', `${finger}-fdp`);
      expect(fdpTop).toBeGreaterThan(top('skeleton', `${finger}-distal`));
      expect(fdpTop).toBeLessThanOrEqual(bottom('skeleton', `${finger}-distal`) + 1);

      const fdsTop = top('tendon', `${finger}-fds`);
      expect(fdsTop).toBeGreaterThanOrEqual(top('skeleton', `${finger}-middle`));
      expect(fdsTop).toBeLessThanOrEqual(bottom('skeleton', `${finger}-middle`));
    },
  );

  it.each(LONG_FINGERS)(
    'puts the %s pulleys over the right bones and joints',
    finger => {
      const on = (pulley: string, bone: string) =>
        expect(
          overlaps(pixels('tendon', `${finger}-${pulley}`), pixels('skeleton', `${finger}-${bone}`)),
        ).toBe(true);
      on('a1', 'mcp');
      on('a2', 'proximal');
      on('a3', 'pip');
      on('a4', 'middle');
      on('a5', 'dip');
      // A2 and A4 lie along their bones, between the joints.
      expect(
        ys('tendon', `${finger}-a2`).every(
          y =>
            y > top('skeleton', `${finger}-proximal`) &&
            y < bottom('skeleton', `${finger}-proximal`),
        ),
      ).toBe(true);
      expect(
        ys('tendon', `${finger}-a4`).every(
          y =>
            y >= top('skeleton', `${finger}-middle`) &&
            y <= bottom('skeleton', `${finger}-middle`),
        ),
      ).toBe(true);
    },
  );

  it("follows the thumb: FPL to the distal phalanx, pulleys in their places", () => {
    const thumbTip = new Set([
      ...pixels('skeleton', 'thumb-distal'),
      ...pixels('skeleton', 'thumb-ip'),
    ]);
    expect(overlaps(pixels('tendon', 'thumb-fpl'), thumbTip)).toBe(true);
    expect(
      overlaps(pixels('tendon', 'thumb-oblique'), pixels('skeleton', 'thumb-proximal')),
    ).toBe(true);
    expect(
      overlaps(pixels('tendon', 'thumb-a1'), pixels('skeleton', 'thumb-mcp')),
    ).toBe(true);
    const ipEnd = new Set([
      ...pixels('skeleton', 'thumb-ip'),
      ...pixels('skeleton', 'thumb-proximal'),
    ]);
    expect(overlaps(pixels('tendon', 'thumb-a2'), ipEnd)).toBe(true);
  });

  it('keeps the interossei between the metacarpals', () => {
    // The knuckle joints own the top of each metacarpal head.
    const ray = (finger: string) => [`${finger}-metacarpal`, `${finger}-mcp`];
    const outside = [...pixels('muscle', 'interossei')].filter(p => {
      const [x, y] = p.split(',').map(Number);
      const row = handAnatomy('skeleton', 'left').regions[y];
      const left = Math.min(...ray('index').map(id => row.indexOf(id)).filter(i => i >= 0));
      const right = Math.max(...ray('little').map(id => row.lastIndexOf(id)));
      return !(x > left && x < right);
    });
    expect(outside).toEqual([]);
  });

  it('puts the thumb muscles on the thumb side and the little finger muscles on the other', () => {
    for (const id of ['abductor-pollicis-brevis', 'flexor-pollicis-brevis', 'opponens-pollicis']) {
      expect(meanX('muscle', id)).toBeLessThan(meanX('muscle', 'interossei'));
    }
    for (const id of [
      'abductor-digiti-minimi',
      'flexor-digiti-minimi-brevis',
      'opponens-digiti-minimi',
    ]) {
      expect(meanX('muscle', id)).toBeGreaterThan(meanX('muscle', 'interossei'));
    }
  });
});

describe('pickPart', () => {
  const { regions } = handAnatomy('skeleton', 'left');
  const find = (id: string) => {
    for (let y = 0; y < regions.length; y++) {
      const x = regions[y].indexOf(id);
      if (x >= 0) {
        return { x, y };
      }
    }
    throw new Error(id);
  };

  it('returns the part under the pixel', () => {
    const { x, y } = find('ring-proximal');
    expect(pickPart(regions, x, y)).toBe('ring-proximal');
  });

  it('takes the nearest part when a tap just misses', () => {
    const { x, y } = find('middle-distal');
    // One pixel above the top of the fingertip bone is soft tissue.
    expect(regions[y - 1][x]).toBe('.');
    expect(pickPart(regions, x, y - 1)).toBe('middle-distal');
  });

  it('returns null far from any part, and off the picture', () => {
    expect(pickPart(regions, 0, 0)).toBeNull();
    expect(pickPart(regions, -10, 500)).toBeNull();
  });
});
