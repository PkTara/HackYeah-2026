import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { OCEAN_COLORS, oceanScene } from '../pixel/ocean';
import { SAVANNA_COLORS, savannaScene } from '../pixel/savanna';
import { useTheme } from '../theme';
import { Dolphin } from './Dolphin';
import type { FramePetProps } from './FramePet';
import { Gazelle } from './Gazelle';
import { PixelArt } from './PixelArt';
import { PixelText } from './PixelText';

type Props = {
  /** Which sport's world: the gazelle's savanna or the dolphin's ocean. */
  world: 'savanna' | 'ocean';
  width: number;
  /** Quests done inside the current level, 0 to steps - 1. */
  step: number;
  steps: number;
  cosmetics: readonly string[];
  /** Changes when XP is earned, which makes the pet leap. */
  cheerKey: number;
  title: string;
};

const HEIGHT = 62; // art pixels, same as the jungle

type WorldSetup = Readonly<{
  Pet: ComponentType<FramePetProps>;
  petWidth: number;
  /** Keeps the finish marker clear of the scenery on the right edge. */
  finishInset: number;
  draw: (
    cols: number,
    night: boolean,
    markerXs: readonly number[],
  ) => { rows: string[]; petTop: number };
  colors: { day: Record<string, string>; night: Record<string, string> };
  /** "Your gazelle, at marker 2 of 5 on the track" */
  label: (at: number, of: number) => string;
}>;

const WORLDS: Record<Props['world'], WorldSetup> = {
  savanna: {
    Pet: Gazelle,
    petWidth: 31,
    finishInset: 20, // the big acacia
    draw: (cols, night, markerXs) => {
      const s = savannaScene(cols, HEIGHT, { night, markerXs });
      return { rows: s.rows, petTop: s.trackTop - 29 + 3 }; // hooves on the track
    },
    colors: SAVANNA_COLORS,
    label: (at, of) => `Your gazelle, at marker ${at} of ${of} on the track`,
  },
  ocean: {
    Pet: Dolphin,
    petWidth: 38,
    finishInset: 16, // the palm island
    draw: (cols, night, markerXs) => {
      const s = oceanScene(cols, HEIGHT, { night, markerXs });
      return { rows: s.rows, petTop: s.surface + 3 }; // just under the waves
    },
    colors: OCEAN_COLORS,
    label: (at, of) => `Your dolphin, at buoy ${at} of ${of}`,
  },
};

/**
 * The top of a sport profile, the sport version of JungleHero: the pet moves
 * to the next marker for each quest (a post on the savanna track, a buoy at
 * sea) and reaches the finish flag at the next level.
 */
export function SportHero({
  world,
  width,
  step,
  steps,
  cosmetics,
  cheerKey,
  title,
}: Props) {
  const theme = useTheme();
  const setup = WORLDS[world];
  const scale = width >= 700 ? 5 : 4;
  const cols = Math.ceil(width / scale);

  const night = theme.scheme === 'dark';
  const { scene, lefts } = useMemo(() => {
    // Pet left edge (art px) for each step, start to finish.
    const first = 2;
    const last = Math.max(first, cols - setup.finishInset - setup.petWidth - 1);
    const xs = Array.from({ length: steps }, (_, i) =>
      Math.round(first + ((last - first) * i) / Math.max(1, steps - 1)),
    );
    // Each marker stands just in front of the pet's nose.
    const markerXs = xs.map(x => x + setup.petWidth + 1);
    return { scene: setup.draw(cols, night, markerXs), lefts: xs };
  }, [cols, night, steps, setup]);
  const colors = night ? setup.colors.night : setup.colors.day;

  const clamped = Math.max(0, Math.min(step, steps - 1));

  // Move to the new marker one pixel at a time. Going back (a new level
  // starts at the line) or reduced motion jumps straight there.
  const target = lefts[clamped];
  const reduced = useReducedMotion();
  const [left, setLeft] = useState(target);
  const tick = useTicker(30, left < target && !reduced);
  useEffect(() => {
    if (left > target || reduced) {
      setLeft(target);
    }
  }, [left, target, reduced]);
  useEffect(() => {
    if (tick > 0) {
      setLeft(x => Math.min(target, x + 1));
    }
  }, [tick, target]);

  const titleScale = width >= 700 ? 6 : width >= 380 ? 4 : 3;
  const { Pet } = setup;

  return (
    <View style={{ width, height: HEIGHT * scale, overflow: 'hidden' }}>
      <PixelArt rows={scene.rows} colors={colors} scale={scale} />
      <PixelText
        text={title}
        heading
        scale={titleScale}
        color="#FFF4DC"
        shadow="#22180F"
        style={{ position: 'absolute', left: scale * 4, top: scale * 5 }}
      />
      <Pet
        scale={scale}
        cosmetics={cosmetics}
        cheerKey={cheerKey}
        accessibilityLabel={setup.label(clamped + 1, steps)}
        style={{
          position: 'absolute',
          left: left * scale,
          top: scene.petTop * scale,
          width: setup.petWidth * scale,
        }}
      />
    </View>
  );
}
