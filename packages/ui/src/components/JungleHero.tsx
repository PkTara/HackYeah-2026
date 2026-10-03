import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { jungleScene, SCENE_COLORS } from '../pixel/scene';
import { useTheme } from '../theme';
import { Monkey } from './Monkey';
import { PixelArt } from './PixelArt';
import { PixelText } from './PixelText';

type Props = {
  width: number;
  /** Quests done inside the current level, 0 to steps - 1. */
  step: number;
  steps: number;
  cosmetics: readonly string[];
  /** Changes when XP is earned, which makes the monkey cheer. */
  cheerKey: number;
  title: string;
};

const SCALE = 4;
const HEIGHT = 62; // art pixels
const MONKEY_W = 32;
const MONKEY_H = 28;
const HOLD_X = 24; // where the monkey's hand sits inside its sprite

/**
 * The top of the profile: the monkey climbs one hold up the trunk per quest
 * and reaches the canopy at the next level.
 */
export function JungleHero({
  width,
  step,
  steps,
  cosmetics,
  cheerKey,
  title,
}: Props) {
  const theme = useTheme();
  const cols = Math.ceil(width / SCALE);

  const night = theme.scheme === 'dark';
  const { scene, stepTops } = useMemo(() => {
    // Monkey top (art px) for each step, bottom of the trunk to the top.
    const lowest = HEIGHT - MONKEY_H - 6;
    const highest = 3;
    const tops = Array.from({ length: steps }, (_, i) =>
      Math.round(lowest - ((lowest - highest) * i) / Math.max(1, steps - 1)),
    );
    const holdRows = tops.map(top => top + 3);
    return {
      scene: jungleScene(cols, HEIGHT, { night, holdRows }),
      stepTops: tops,
    };
  }, [cols, night, steps]);
  const colors = night ? SCENE_COLORS.night : SCENE_COLORS.day;

  const clamped = Math.max(0, Math.min(step, steps - 1));

  // Climb up to the new hold one pixel at a time. Going down (a new level
  // starts at the bottom) or reduced motion jumps straight there.
  const target = stepTops[clamped];
  const reduced = useReducedMotion();
  const [top, setTop] = useState(target);
  const tick = useTicker(45, top > target && !reduced);
  useEffect(() => {
    if (top < target || reduced) {
      setTop(target);
    }
  }, [top, target, reduced]);
  useEffect(() => {
    if (tick > 0) {
      setTop(t => Math.max(target, t - 1));
    }
  }, [tick, target]);

  const monkeyLeft = scene.trunkX + scene.trunkWidth / 2 - HOLD_X;
  const titleScale = width >= 380 ? 4 : 3;

  return (
    <View style={{ width, height: HEIGHT * SCALE, overflow: 'hidden' }}>
      <PixelArt rows={scene.rows} colors={colors} scale={SCALE} />
      <PixelText
        text={title}
        heading
        scale={titleScale}
        color="#FFF4DC"
        shadow="#22180F"
        style={{ position: 'absolute', left: 16, top: 18 }}
      />
      <Monkey
        scale={SCALE}
        cosmetics={cosmetics}
        cheerKey={cheerKey}
        accessibilityLabel={`Your monkey, on hold ${clamped + 1} of ${steps} up the tree`}
        style={{
          position: 'absolute',
          left: monkeyLeft * SCALE,
          top: top * SCALE,
          width: MONKEY_W * SCALE,
        }}
      />
    </View>
  );
}
