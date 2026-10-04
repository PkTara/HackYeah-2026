import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { SPRITE_COLORS } from '../pixel/sprites';
import { PixelArt } from './PixelArt';

export type FramePetProps = {
  scale?: number;
  cosmetics?: readonly string[];
  /** Change this value (e.g. pass total XP) to make the pet leap. */
  cheerKey?: number;
  /** Leap the whole time it is shown, e.g. on the level-up banner. */
  celebrate?: boolean;
  /** No movement, e.g. in a list or on the symptom screen. */
  still?: boolean;
  /** Greyed out and still, for a pet that is not unlocked yet. */
  locked?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const LOCKED_COLORS = Object.fromEntries(
  Object.keys(SPRITE_COLORS).map(k => [k, k === 'O' ? '#22180F' : '#7D8A7A']),
);

// A leap: up high, a hang, and down. Art pixels, negative is up.
const LEAP = [0, -3, -6, -7, -6, -3, 0, 0];

/**
 * A pet that moves in two frames: the gazelle's gallop, the dolphin's tail.
 * It bobs with each frame and leaps when cheerKey changes, like the monkey's
 * hop. Gazelle.tsx and Dolphin.tsx only pick the frames.
 */
export function FramePet({
  rows,
  ms = 180,
  scale = 3,
  cosmetics = [],
  cheerKey,
  celebrate = false,
  still = false,
  locked = false,
  accessibilityLabel,
  style,
}: FramePetProps & {
  /** The sprite for a frame (0 or 1) with these cosmetics on. */
  rows: (frame: number, cosmetics: readonly string[]) => string[];
  /** Time per frame. */
  ms?: number;
}) {
  const reduced = useReducedMotion();
  const animate = !still && !locked && !reduced;
  const tick = useTicker(ms, animate);
  const [cheerFrom, setCheerFrom] = useState<number | null>(null);
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const firstKey = useRef(cheerKey);

  useEffect(() => {
    if (cheerKey === firstKey.current) {
      return;
    }
    firstKey.current = cheerKey;
    setCheerFrom(tickRef.current);
    const done = setTimeout(() => setCheerFrom(null), 1600);
    return () => clearTimeout(done);
  }, [cheerKey]);

  const cheering = celebrate || cheerFrom !== null;
  const step = cheering ? tick - (cheerFrom ?? 0) : tick;
  const frame = animate ? tick % 2 : 0;
  const dy = !animate ? 0 : cheering ? LEAP[step % LEAP.length] : -(tick % 2);

  const cosmeticsKey = cosmetics.join(',');
  const sprite = useMemo(
    () => rows(frame, cosmeticsKey ? cosmeticsKey.split(',') : []),
    [rows, frame, cosmeticsKey],
  );

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={
        accessibilityLabel ? undefined : 'no-hide-descendants'
      }
      style={style}
    >
      <View style={{ transform: [{ translateY: dy * scale }] }}>
        <PixelArt
          rows={sprite}
          colors={locked ? LOCKED_COLORS : SPRITE_COLORS}
          scale={scale}
        />
      </View>
    </View>
  );
}
