import { mirror } from '../pixel/raster';
import {
  GAZELLE_FRAMES,
  HAND_HEIGHT,
  HAND_WIDTH,
  ICONS,
  LEFT_HAND_FINGERS,
  SPRITE_COLORS,
  handRows,
  monkeyRows,
  type MonkeyPose,
} from '../pixel/sprites';

const POSES: MonkeyPose[] = ['idle', 'blink', 'cheer'];
const COSMETIC_SETS: string[][] = [
  [],
  ['headband'],
  ['leaf-crown'],
  ['headband', 'leaf-crown'],
];
const FINGERS = Object.keys(LEFT_HAND_FINGERS);

/** "width x height", listing every row width when the rows disagree. */
function size(rows: readonly string[]): string {
  const widths = [...new Set(rows.map(row => row.length))];
  return `${widths.join('/')}x${rows.length}`;
}

type Change = { x: number; y: number; from: string; to: string };

const byPosition = (a: Change, b: Change) => a.y - b.y || a.x - b.x;

function changes(
  before: readonly string[],
  after: readonly string[],
): Change[] {
  const out: Change[] = [];
  before.forEach((row, y) => {
    [...row].forEach((from, x) => {
      const to = after[y][x];
      if (to !== from) {
        out.push({ x, y, from, to });
      }
    });
  });
  return out;
}

function keysOf(rows: readonly string[]): Set<string> {
  return new Set(rows.join(''));
}

describe('ICONS', () => {
  it('are all 12x12', () => {
    const sizes = Object.fromEntries(
      Object.entries(ICONS).map(([name, rows]) => [name, size(rows)]),
    );
    const expected = Object.fromEntries(
      Object.keys(ICONS).map(name => [name, '12x12']),
    );
    expect(sizes).toEqual(expected);
  });

  it("draws the bin in ink and paper only, so it takes the button's colour", () => {
    expect([...keysOf(ICONS.bin)].sort()).toEqual(['#', '.', 'W']);
  });

  it('draws the bin the same on both sides', () => {
    expect(mirror(ICONS.bin)).toEqual(ICONS.bin);
  });

  it('draws the music speakers in ink and paper, the same speaker in both', () => {
    for (const rows of [ICONS.speaker, ICONS.speakerOff]) {
      expect([...keysOf(rows)].sort()).toEqual(['#', '.', 'W']);
    }
    const speaker = (rows: readonly string[]) => rows.map(row => row.slice(0, 7));
    expect(speaker(ICONS.speakerOff)).toEqual(speaker(ICONS.speaker));
    expect(ICONS.speakerOff).not.toEqual(ICONS.speaker);
  });
});

describe('monkeyRows', () => {
  it('gives every pose and cosmetic the same 32x28 frame', () => {
    const sizes = POSES.flatMap(pose =>
      COSMETIC_SETS.map(
        cosmetics =>
          `${pose} ${cosmetics.join('+') || 'plain'}: ${size(
            monkeyRows(pose, cosmetics),
          )}`,
      ),
    );
    const expected = POSES.flatMap(pose =>
      COSMETIC_SETS.map(
        cosmetics => `${pose} ${cosmetics.join('+') || 'plain'}: 32x28`,
      ),
    );
    expect(sizes).toEqual(expected);
  });

  it('draws each pose differently', () => {
    const [idle, blink, cheer] = POSES.map(pose => monkeyRows(pose));
    expect(blink).not.toEqual(idle);
    expect(cheer).not.toEqual(idle);
    expect(cheer).not.toEqual(blink);
  });

  it('defaults to no cosmetics', () => {
    expect(monkeyRows('idle')).toEqual(monkeyRows('idle', []));
  });

  it('draws each cosmetic on top of the plain monkey', () => {
    const plain = monkeyRows('idle');
    expect(
      changes(plain, monkeyRows('idle', ['headband'])).length,
    ).toBeGreaterThan(0);
    expect(
      changes(plain, monkeyRows('idle', ['leaf-crown'])).length,
    ).toBeGreaterThan(0);
  });

  it('does not care about the order of cosmetics', () => {
    expect(monkeyRows('cheer', ['leaf-crown', 'headband'])).toEqual(
      monkeyRows('cheer', ['headband', 'leaf-crown']),
    );
  });

  it('ignores cosmetics it does not know', () => {
    expect(monkeyRows('idle', ['top-hat'])).toEqual(monkeyRows('idle'));
  });
});

describe('handRows', () => {
  it('is HAND_WIDTH x HAND_HEIGHT for both hands', () => {
    for (const side of ['left', 'right'] as const) {
      expect(size(handRows(side, FINGERS))).toBe(
        `${HAND_WIDTH}x${HAND_HEIGHT}`,
      );
    }
  });

  it('draws the right hand as the mirror image of the left one', () => {
    expect(handRows('right', ['ring'])).toEqual(
      mirror(handRows('left', ['ring'])),
    );
    expect(handRows('right', [])).toEqual(mirror(handRows('left', [])));
  });

  it('uses no sore colours when no finger is sore', () => {
    for (const side of ['left', 'right'] as const) {
      const keys = keysOf(handRows(side, []));
      expect(keys.has('K')).toBe(false);
      expect(keys.has('k')).toBe(false);
    }
  });

  it('covers the five fingers the app records', () => {
    expect([...FINGERS].sort()).toEqual([
      'index',
      'little',
      'middle',
      'ring',
      'thumb',
    ]);
  });

  it('keeps finger regions inside the hand and apart from each other', () => {
    const owner = new Map<string, string>();
    const problems: string[] = [];
    for (const [finger, r] of Object.entries(LEFT_HAND_FINGERS)) {
      if (r.x0 < 0 || r.y0 < 0 || r.x1 >= HAND_WIDTH || r.y1 >= HAND_HEIGHT) {
        problems.push(`${finger} leaves the hand`);
      }
      for (let y = r.y0; y <= r.y1; y++) {
        for (let x = r.x0; x <= r.x1; x++) {
          const other = owner.get(`${x},${y}`);
          if (other) {
            problems.push(`${finger} overlaps ${other} at ${x},${y}`);
          }
          owner.set(`${x},${y}`, finger);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  describe.each(FINGERS)('a sore %s', finger => {
    const region = LEFT_HAND_FINGERS[finger];
    const inRegion = ({ x, y }: { x: number; y: number }) =>
      x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1;
    const healthy = handRows('left', []);
    const sore = handRows('left', [finger]);
    const changed = changes(healthy, sore);

    it("turns skin 'S' into 'K' and crease 's' into 'k', and nothing else", () => {
      expect(changed.length).toBeGreaterThan(0);
      const wrong = changed.filter(
        c =>
          !(c.from === 'S' && c.to === 'K') &&
          !(c.from === 's' && c.to === 'k'),
      );
      expect(wrong).toEqual([]);
    });

    it('changes pixels only inside its region', () => {
      expect(changed.filter(c => !inRegion(c))).toEqual([]);
    });

    it('leaves no healthy skin inside its region', () => {
      const left: { x: number; y: number }[] = [];
      sore.forEach((row, y) => {
        [...row].forEach((k, x) => {
          if ((k === 'S' || k === 's') && inRegion({ x, y })) {
            left.push({ x, y });
          }
        });
      });
      expect(left).toEqual([]);
    });

    it('shows up in the mirrored region on the right hand', () => {
      const right = changes(handRows('right', []), handRows('right', [finger]));
      const flippedBack = right.map(c => ({ ...c, x: HAND_WIDTH - 1 - c.x }));
      expect(flippedBack.sort(byPosition)).toEqual(
        [...changed].sort(byPosition),
      );
    });
  });

  it('combines several sore fingers', () => {
    const healthy = handRows('left', []);
    const both = changes(healthy, handRows('left', ['index', 'ring']));
    const separately = [
      ...changes(healthy, handRows('left', ['index'])),
      ...changes(healthy, handRows('left', ['ring'])),
    ];
    expect([...both].sort(byPosition)).toEqual(
      [...separately].sort(byPosition),
    );
  });
});

describe('GAZELLE_FRAMES', () => {
  it('has at least two frames that share one size with equal-length rows', () => {
    expect(GAZELLE_FRAMES.length).toBeGreaterThanOrEqual(2);
    const sizes = new Set(GAZELLE_FRAMES.map(size));
    expect([...sizes]).toEqual([size(GAZELLE_FRAMES[0])]);
    expect(size(GAZELLE_FRAMES[0])).toMatch(/^\d+x\d+$/);
  });

  it('animates: consecutive frames differ', () => {
    GAZELLE_FRAMES.forEach((frame, i) => {
      const next = GAZELLE_FRAMES[(i + 1) % GAZELLE_FRAMES.length];
      expect(frame).not.toEqual(next);
    });
  });
});

describe('SPRITE_COLORS', () => {
  it('has a colour for every key the monkey, hands and gazelle use', () => {
    const used = new Map<string, Set<string>>();
    const note = (name: string, rows: readonly string[]) => {
      for (const key of keysOf(rows)) {
        if (key !== '.' && !(key in SPRITE_COLORS)) {
          used.set(key, (used.get(key) ?? new Set<string>()).add(name));
        }
      }
    };
    for (const pose of POSES) {
      for (const cosmetics of COSMETIC_SETS) {
        note(
          `monkey ${pose} ${cosmetics.join('+')}`,
          monkeyRows(pose, cosmetics),
        );
      }
    }
    for (const side of ['left', 'right'] as const) {
      note(`${side} hand`, handRows(side, []));
      note(`${side} sore hand`, handRows(side, FINGERS));
    }
    GAZELLE_FRAMES.forEach((frame, i) => note(`gazelle ${i}`, frame));
    const missing = [...used].map(
      ([key, names]) => `${key} in ${[...names].join(', ')}`,
    );
    expect(missing).toEqual([]);
  });

  it("has a colour for every icon key except '#', the caller's ink", () => {
    const missing = Object.entries(ICONS).flatMap(([name, rows]) =>
      [...keysOf(rows)]
        .filter(key => key !== '.' && key !== '#' && !(key in SPRITE_COLORS))
        .map(key => `${key} in ${name}`),
    );
    expect(missing).toEqual([]);
  });

  it('maps each key to a #RRGGBB colour', () => {
    const bad = Object.entries(SPRITE_COLORS).filter(
      ([, colour]) => !/^#[0-9A-F]{6}$/i.test(colour),
    );
    expect(bad).toEqual([]);
  });
});
