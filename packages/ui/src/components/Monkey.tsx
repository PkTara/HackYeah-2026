import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { monkeyRows, SPRITE_COLORS, type MonkeyPose } from '../pixel/sprites';
import { PixelArt } from './PixelArt';

type Props = {
  scale?: number;
  cosmetics?: readonly string[];
  /** Change this value (e.g. pass total XP) to make the monkey cheer. */
  cheerKey?: number;
  /** Cheer the whole time it is shown, e.g. on the level-up banner. */
  celebrate?: boolean;
  /** No idle animation, e.g. on the symptom screen. */
  still?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const HOP = [0, -3, -5, -3, 0, -2, 0, 0];

/** The companion. Breathes, blinks, and hops with joy when cheerKey changes. */
export function Monkey({
  scale = 4,
  cosmetics = [],
  cheerKey,
  celebrate = false,
  still = false,
  accessibilityLabel,
  style,
}: Props) {
  const reduced = useReducedMotion();
  const animate = !still && !reduced;
  const tick = useTicker(160, animate);
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
  const pose: MonkeyPose = cheering
    ? 'cheer'
    : animate && tick % 24 === 0
      ? 'blink'
      : 'idle';
  const dy = !animate
    ? 0
    : cheering
      ? HOP[step % HOP.length]
      : Math.floor(tick / 4) % 2;

  const cosmeticsKey = cosmetics.join(',');
  const rows = useMemo(
    () => monkeyRows(pose, cosmeticsKey ? cosmeticsKey.split(',') : []),
    [pose, cosmeticsKey],
  );

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      {/* Only this wrapper moves; the sprite itself is memoised. */}
      <View style={{ transform: [{ translateY: dy * scale }] }}>
        <PixelArt rows={rows} colors={SPRITE_COLORS} scale={scale} />
      </View>
    </View>
  );
}
