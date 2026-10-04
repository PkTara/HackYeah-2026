import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { SAVANNA_COLORS, savannaScene } from '../pixel/savanna';
import { useTheme } from '../theme';
import { Gazelle } from './Gazelle';
import { PixelArt } from './PixelArt';
import { PixelText } from './PixelText';

type Props = {
  width: number;
  /** Quests done inside the current level, 0 to steps - 1. */
  step: number;
  steps: number;
  cosmetics: readonly string[];
  /** Changes when XP is earned, which makes the gazelle leap. */
  cheerKey: number;
  title: string;
};

const HEIGHT = 62; // art pixels, same as the jungle
const GAZELLE_W = 31;
const GAZELLE_H = 29;
const FINISH_INSET = 20; // keeps the finish flag clear of the big acacia

/**
 * The top of the gazelle profile, the savanna version of JungleHero: the
 * gazelle runs to the next marker post per quest and reaches the finish
 * flag at the next level.
 */
export function SavannaHero({
  width,
  step,
  steps,
  cosmetics,
  cheerKey,
  title,
}: Props) {
  const theme = useTheme();
  const scale = width >= 700 ? 5 : 4;
  const cols = Math.ceil(width / scale);

  const night = theme.scheme === 'dark';
  const { scene, lefts } = useMemo(() => {
    // Gazelle left edge (art px) for each step, start to finish.
    const first = 2;
    const last = Math.max(first, cols - FINISH_INSET - GAZELLE_W - 1);
    const xs = Array.from({ length: steps }, (_, i) =>
      Math.round(first + ((last - first) * i) / Math.max(1, steps - 1)),
    );
    // Each marker post stands just in front of the gazelle's nose.
    const markerXs = xs.map(x => x + GAZELLE_W + 1);
    return {
      scene: savannaScene(cols, HEIGHT, { night, markerXs }),
      lefts: xs,
    };
  }, [cols, night, steps]);
  const colors = night ? SAVANNA_COLORS.night : SAVANNA_COLORS.day;

  const clamped = Math.max(0, Math.min(step, steps - 1));

  // Run to the new marker one pixel at a time. Going back (a new level
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
  const top = scene.trackTop - GAZELLE_H + 3;

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
      <Gazelle
        scale={scale}
        cosmetics={cosmetics}
        cheerKey={cheerKey}
        accessibilityLabel={`Your gazelle, at marker ${
          clamped + 1
        } of ${steps} on the track`}
        style={{
          position: 'absolute',
          left: left * scale,
          top: top * scale,
          width: GAZELLE_W * scale,
        }}
      />
    </View>
  );
}
