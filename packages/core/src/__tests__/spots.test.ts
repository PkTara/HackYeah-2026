import { FINGERS } from '../game';
import {
  SPOT_LAYERS,
  markedSpots,
  spotsFor,
  type FingerPart,
} from '../spots';

/** Parts from the tip down. A thumb skips the middle segment and joint. */
const PARTS: readonly FingerPart[] = [
  'tip',
  'endJoint',
  'middle',
  'middleJoint',
  'base',
  'knuckle',
  'palm',
];
const THUMB_PARTS = PARTS.filter(p => p !== 'middle' && p !== 'middleJoint');

describe('spotsFor', () => {
  it.each(FINGERS)('gives the %s spots on every layer, with unique ids', finger => {
    const spots = spotsFor(finger);
    expect(new Set(spots.map(s => s.layer))).toEqual(new Set(SPOT_LAYERS));
    expect(new Set(spots.map(s => s.id)).size).toBe(spots.length);
  });

  it('gives the four fingers the same anatomy and the thumb its own', () => {
    const ids = (finger: (typeof FINGERS)[number]) => spotsFor(finger).map(s => s.id);
    expect(ids('middle')).toEqual(ids('index'));
    expect(ids('ring')).toEqual(ids('index'));
    expect(ids('little')).toEqual(ids('index'));
    expect(ids('index')).toEqual([
      'distal', 'dip', 'middle', 'pip', 'proximal', 'mcp',
      'a1', 'a2', 'a3', 'a4', 'a5',
      'flexor-finger', 'flexor-palm',
    ]);
    expect(ids('thumb')).toEqual([
      'distal', 'ip', 'proximal', 'mcp',
      'a1', 'oblique', 'a2',
      'fpl',
    ]);
  });

  it.each(FINGERS)('puts every %s spot on parts that digit has, tip first', finger => {
    const parts = finger === 'thumb' ? THUMB_PARTS : PARTS;
    const wrong = spotsFor(finger)
      .filter(s => {
        const at = parts.indexOf(s.at);
        const to = parts.indexOf(s.to ?? s.at);
        return at < 0 || to < at;
      })
      .map(s => s.id);
    expect(wrong).toEqual([]);
  });

  it('gives each spot of a layer its own parts, so no two rows overlap', () => {
    for (const finger of ['index', 'thumb'] as const) {
      const parts = finger === 'thumb' ? THUMB_PARTS : PARTS;
      for (const layer of SPOT_LAYERS) {
        const covered = spotsFor(finger)
          .filter(s => s.layer === layer)
          .flatMap(s =>
            parts.slice(parts.indexOf(s.at), parts.indexOf(s.to ?? s.at) + 1),
          );
        expect(new Set(covered).size).toBe(covered.length);
      }
    }
  });

  it('keeps names short: the close-up shows them in the pixel font', () => {
    const long = FINGERS.flatMap(f => spotsFor(f))
      .map(s => s.name)
      .filter(name => name.length > 14);
    expect(long).toEqual([]);
  });

  it('names places, never injuries', () => {
    const words = FINGERS.flatMap(f => spotsFor(f)).flatMap(s => [s.name, s.detail]);
    expect(words.filter(w => /tear|rupture|injur|strain|sprain/i.test(w))).toEqual([]);
  });
});

describe('markedSpots', () => {
  it('lists marked spots in list order, whatever order they were tapped', () => {
    expect(markedSpots('ring', ['a2', 'pip']).map(s => s.name)).toEqual([
      'Middle joint',
      'A2 pulley',
    ]);
  });

  it('drops ids it does not know and repeats', () => {
    expect(markedSpots('index', ['a2', 'nope', 'a2']).map(s => s.id)).toEqual(['a2']);
    // The oblique pulley is a thumb spot only.
    expect(markedSpots('index', ['oblique'])).toEqual([]);
  });

  it('is empty for "not sure where"', () => {
    expect(markedSpots('little', [])).toEqual([]);
  });
});
