import {
  ANATOMY,
  ANATOMY_GROUPS,
  ANATOMY_LAYERS,
  anatomyById,
  anatomyGroups,
  anatomyIdForSpot,
  anatomyIn,
  counterpartIn,
  type AnatomyLayer,
} from '../anatomy';
import { FINGERS } from '../game';
import { spotsFor, type SpotLayer } from '../spots';

const LONG_FINGERS = ['index', 'middle', 'ring', 'little'] as const;

/** Sentences end with a full stop or a question mark. */
function sentences(text: string): number {
  return text.split(/[.?](\s|$)/).filter(s => s.trim().length > 0).length;
}

describe('anatomy content', () => {
  it('gives every part a name, plain words and both explanations', () => {
    const missing = ANATOMY.filter(
      s => !s.name.trim() || !s.plain.trim() || !s.what.trim() || !s.climbing.trim(),
    ).map(s => s.id);
    expect(missing).toEqual([]);
  });

  it('keeps "what it is" to two sentences and "why climbers care" to one', () => {
    expect(ANATOMY.filter(s => sentences(s.what) > 2).map(s => s.id)).toEqual(
      [],
    );
    expect(
      ANATOMY.filter(s => sentences(s.climbing) !== 1).map(s => s.id),
    ).toEqual([]);
  });

  it('follows the copy rules: no dashes, exclamation marks or hype words', () => {
    // En dash, em dash, exclamation mark, and words the copy avoids.
    const banned = /[\u2013\u2014!]|journey|empower|seamless|let's/i;
    const bad = ANATOMY.filter(s =>
      [s.name, s.plain, s.what, s.climbing].some(t => banned.test(t)),
    ).map(s => s.id);
    expect(bad).toEqual([]);
  });

  it('uses unique ids', () => {
    const ids = ANATOMY.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has parts on every layer and only on known layers and groups', () => {
    for (const layer of ANATOMY_LAYERS) {
      expect(anatomyIn(layer).length).toBeGreaterThan(0);
    }
    expect(ANATOMY.filter(s => !ANATOMY_LAYERS.includes(s.layer))).toEqual([]);
    expect(ANATOMY.filter(s => !ANATOMY_GROUPS.includes(s.group))).toEqual([]);
  });

  it('looks parts up by id', () => {
    expect(anatomyById('ring-a2')?.name).toBe('A2 pulley');
    expect(anatomyById('nope')).toBeUndefined();
  });
});

describe('the skeleton', () => {
  const ids = new Set(anatomyIn('skeleton').map(s => s.id));

  it.each(LONG_FINGERS)(
    'gives the %s finger three phalanges, three joints and a metacarpal',
    finger => {
      for (const part of [
        'distal',
        'dip',
        'middle',
        'pip',
        'proximal',
        'mcp',
        'metacarpal',
      ]) {
        expect(ids).toContain(`${finger}-${part}`);
      }
    },
  );

  it('gives the thumb two phalanges, an IP and an MCP joint, and no middle phalanx', () => {
    const thumb = anatomyIn('skeleton')
      .filter(s => s.finger === 'thumb')
      .map(s => s.id);
    expect(thumb).toEqual([
      'thumb-distal',
      'thumb-ip',
      'thumb-proximal',
      'thumb-mcp',
      'thumb-metacarpal',
    ]);
    expect(ANATOMY.filter(s => s.finger === 'thumb' && /phalanx/.test(s.name)))
      .toHaveLength(2);
    expect(ids).not.toContain('thumb-middle');
    expect(ids).not.toContain('thumb-pip');
  });

  it('counts 27 hand bones: 14 phalanges, 5 metacarpals and 8 carpals', () => {
    const bones = anatomyIn('skeleton').filter(s => !/joint/i.test(s.name));
    const phalanges = bones.filter(s => /phalanx/.test(s.name));
    const metacarpals = bones.filter(s => /metacarpal/.test(s.name));
    const carpals = bones.filter(s => s.plain === 'Wrist bone');
    expect(phalanges).toHaveLength(14);
    expect(metacarpals).toHaveLength(5);
    expect(carpals.map(s => s.id).sort()).toEqual(
      [
        'capitate',
        'hamate',
        'lunate',
        'pisiform',
        'scaphoid',
        'trapezium',
        'trapezoid',
        'triquetrum',
      ].sort(),
    );
    expect(ids).toContain('radius');
    expect(ids).toContain('ulna');
  });
});

describe('the muscles', () => {
  const ids = anatomyIn('muscle').map(s => s.id);

  it('has the thenar group, adductor, hypothenar group, lumbricals and interossei', () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        'abductor-pollicis-brevis',
        'flexor-pollicis-brevis',
        'opponens-pollicis',
        'adductor-pollicis',
        'abductor-digiti-minimi',
        'flexor-digiti-minimi-brevis',
        'opponens-digiti-minimi',
        'index-lumbrical',
        'middle-lumbrical',
        'ring-lumbrical',
        'little-lumbrical',
        'interossei',
        'forearm-flexors',
      ]),
    );
  });

  it('says the interossei sit between the metacarpals', () => {
    expect(anatomyById('interossei')?.what).toMatch(/between the metacarpals/);
  });

  it('says the strong finger flexors are in the forearm', () => {
    expect(anatomyById('forearm-flexors')?.what).toMatch(/forearm/);
  });
});

describe('the tendons and pulleys', () => {
  it.each(LONG_FINGERS)(
    'gives the %s finger FDP, FDS, the palm tendons and pulleys A1 to A5',
    finger => {
      const ids = anatomyIn('tendon')
        .filter(s => s.finger === finger)
        .map(s => s.id.replace(`${finger}-`, ''));
      expect(ids.sort()).toEqual(
        ['a1', 'a2', 'a3', 'a4', 'a5', 'fdp', 'fds', 'flexor-palm'].sort(),
      );
    },
  );

  it('attaches FDP to the distal phalanx and FDS to the middle phalanx', () => {
    expect(anatomyById('index-fdp')?.what).toMatch(/distal phalanx/);
    expect(anatomyById('index-fds')?.what).toMatch(/middle phalanx/);
    expect(anatomyById('thumb-fpl')?.what).toMatch(/distal phalanx/);
  });

  it("gives the thumb the FPL tendon and its A1, oblique and A2 pulleys", () => {
    const thumb = anatomyIn('tendon')
      .filter(s => s.finger === 'thumb')
      .map(s => s.id);
    expect(thumb.sort()).toEqual(
      ['thumb-a1', 'thumb-a2', 'thumb-fpl', 'thumb-oblique'].sort(),
    );
    expect(anatomyById('carpal-tunnel')?.what).toMatch(/flexor retinaculum/);
  });
});

describe('spots from the finger close-up', () => {
  const layerFor: Record<SpotLayer, AnatomyLayer> = {
    segments: 'skeleton',
    pulleys: 'tendon',
    tendon: 'tendon',
  };

  it.each(FINGERS)(
    'maps every %s spot to a part of the same finger and layer',
    finger => {
      for (const spot of spotsFor(finger)) {
        const id = anatomyIdForSpot(finger, spot.id);
        const part = id ? anatomyById(id) : undefined;
        expect(part?.finger).toBe(finger);
        expect(part?.layer).toBe(layerFor[spot.layer]);
        expect(part?.spot).toBe(spot.id);
      }
    },
  );

  it('reuses the spot id in the part id', () => {
    expect(anatomyIdForSpot('ring', 'a2')).toBe('ring-a2');
    expect(anatomyIdForSpot('thumb', 'oblique')).toBe('thumb-oblique');
    expect(anatomyIdForSpot('index', 'flexor-finger')).toBe('index-fdp');
    expect(anatomyIdForSpot('index', 'nope')).toBeUndefined();
  });

  it('only names spots that the close-up has', () => {
    const wrong = ANATOMY.filter(
      s =>
        s.spot !== undefined &&
        (!s.finger || !spotsFor(s.finger).some(spot => spot.id === s.spot)),
    ).map(s => s.id);
    expect(wrong).toEqual([]);
  });
});

describe('counterpartIn', () => {
  it('follows a finger part from layer to layer', () => {
    expect(counterpartIn('tendon', 'ring-proximal')).toBe('ring-a2');
    expect(counterpartIn('tendon', 'ring-middle')).toBe('ring-a4');
    expect(counterpartIn('tendon', 'ring-pip')).toBe('ring-a3');
    expect(counterpartIn('skeleton', 'ring-a2')).toBe('ring-proximal');
    expect(counterpartIn('skeleton', 'index-fdp')).toBe('index-distal');
    expect(counterpartIn('muscle', 'index-metacarpal')).toBe('index-lumbrical');
    expect(counterpartIn('tendon', 'thumb-proximal')).toBe('thumb-oblique');
  });

  it('keeps a part on its own layer and drops what has no counterpart', () => {
    expect(counterpartIn('skeleton', 'scaphoid')).toBe('scaphoid');
    expect(counterpartIn('muscle', 'scaphoid')).toBeNull();
    expect(counterpartIn('muscle', 'ring-distal')).toBeNull();
    expect(counterpartIn('tendon', null)).toBeNull();
    expect(counterpartIn('tendon', 'nope')).toBeNull();
  });
});

describe('anatomyGroups', () => {
  it('lists the groups each layer uses, fingers first', () => {
    expect(anatomyGroups('skeleton')).toEqual([
      'thumb',
      'index',
      'middle',
      'ring',
      'little',
      'wrist',
    ]);
    expect(anatomyGroups('muscle')).toEqual([
      'thumb',
      'little',
      'palm',
      'wrist',
    ]);
  });
});
