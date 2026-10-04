import { OCEAN_COLORS, oceanScene } from '../pixel/ocean';
import { SAVANNA_COLORS, savannaScene } from '../pixel/savanna';
import {
  DOLPHIN_FRAMES,
  GAZELLE_FRAMES,
  SPRITE_COLORS,
  dolphinRows,
  gazelleRows,
} from '../pixel/sprites';

/** SportHero's height in art pixels. */
const HERO_HEIGHT = 62;
/** Marker posts like the ones SportHero passes for a five-step level. */
const MARKERS = [34, 46, 58, 70, 82];

const CASES = [60, 90, 160].flatMap(cols =>
  [false, true].map(night => ({
    cols,
    night,
    label: `${cols} cols by ${night ? 'night' : 'day'}`,
  })),
);

describe('savannaScene', () => {
  it('is deterministic: the same input gives the same picture', () => {
    const first = savannaScene(90, HERO_HEIGHT, {
      night: true,
      markerXs: MARKERS,
    });
    savannaScene(60, 40, { night: false, markerXs: [] });
    expect(
      savannaScene(90, HERO_HEIGHT, { night: true, markerXs: MARKERS }),
    ).toEqual(first);
  });

  describe.each(CASES)('at $label', ({ cols, night }) => {
    const scene = savannaScene(cols, HERO_HEIGHT, { night, markerXs: MARKERS });
    const palette: Readonly<Record<string, string>> = night
      ? SAVANNA_COLORS.night
      : SAVANNA_COLORS.day;

    it('has one row per art pixel of height, each exactly `cols` wide', () => {
      expect(scene.rows).toHaveLength(HERO_HEIGHT);
      expect(scene.rows.filter(row => row.length !== cols)).toEqual([]);
    });

    it('only uses keys that have a colour in its palette', () => {
      const keys = [...new Set(scene.rows.join(''))];
      expect(keys.filter(key => !(key in palette))).toEqual([]);
    });

    it('covers every pixel, so nothing behind it shows through', () => {
      expect(scene.rows.join('')).not.toContain('.');
    });

    it('puts the track near the bottom for the gazelle to stand on', () => {
      expect(scene.trackTop).toBeGreaterThan(HERO_HEIGHT - 12);
    });
  });
});

describe('gazelleRows', () => {
  it('is the plain gallop frame without cosmetics', () => {
    expect(gazelleRows(0)).toEqual(GAZELLE_FRAMES[0]);
    expect(gazelleRows(3)).toEqual(GAZELLE_FRAMES[1]);
  });

  it('draws the bib and medal inside the sprite with known colours', () => {
    for (const frame of [0, 1]) {
      const rows = gazelleRows(frame, ['race-bib', 'medal']);
      expect(rows).not.toEqual(GAZELLE_FRAMES[frame]);
      expect(rows.map(r => r.length)).toEqual(
        GAZELLE_FRAMES[frame].map(r => r.length),
      );
      const keys = [...new Set(rows.join(''))].filter(k => k !== '.');
      expect(keys.filter(k => !(k in SPRITE_COLORS))).toEqual([]);
    }
  });
});

describe('oceanScene', () => {
  it('is deterministic: the same input gives the same picture', () => {
    const first = oceanScene(90, HERO_HEIGHT, {
      night: false,
      markerXs: MARKERS,
    });
    oceanScene(60, 40, { night: true, markerXs: [] });
    expect(
      oceanScene(90, HERO_HEIGHT, { night: false, markerXs: MARKERS }),
    ).toEqual(first);
  });

  describe.each(CASES)('at $label', ({ cols, night }) => {
    const scene = oceanScene(cols, HERO_HEIGHT, { night, markerXs: MARKERS });
    const palette: Readonly<Record<string, string>> = night
      ? OCEAN_COLORS.night
      : OCEAN_COLORS.day;

    it('has one row per art pixel of height, each exactly `cols` wide', () => {
      expect(scene.rows).toHaveLength(HERO_HEIGHT);
      expect(scene.rows.filter(row => row.length !== cols)).toEqual([]);
    });

    it('only uses keys that have a colour in its palette', () => {
      const keys = [...new Set(scene.rows.join(''))];
      expect(keys.filter(key => !(key in palette))).toEqual([]);
    });

    it('covers every pixel, so nothing behind it shows through', () => {
      expect(scene.rows.join('')).not.toContain('.');
    });

    it('leaves room under the surface for the dolphin', () => {
      // The dolphin is 20 art pixels tall and swims 3 below the surface.
      expect(scene.surface + 3 + 20).toBeLessThan(HERO_HEIGHT - 4);
    });
  });
});

describe('dolphinRows', () => {
  it('is the plain swim frame without cosmetics', () => {
    expect(dolphinRows(0)).toEqual(DOLPHIN_FRAMES[0]);
    expect(dolphinRows(3)).toEqual(DOLPHIN_FRAMES[1]);
  });

  it('draws the cap and goggles inside the sprite with known colours', () => {
    for (const frame of [0, 1]) {
      const rows = dolphinRows(frame, ['swim-cap', 'goggles']);
      expect(rows).not.toEqual(DOLPHIN_FRAMES[frame]);
      expect(rows.map(r => r.length)).toEqual(
        DOLPHIN_FRAMES[frame].map(r => r.length),
      );
      const keys = [...new Set(rows.join(''))].filter(k => k !== '.');
      expect(keys.filter(k => !(k in SPRITE_COLORS))).toEqual([]);
    }
  });
});
