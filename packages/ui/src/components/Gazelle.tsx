import { useMemo } from 'react';
import { View } from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { GAZELLE_FRAMES, SPRITE_COLORS } from '../pixel/sprites';
import { PixelArt } from './PixelArt';

type Props = {
  scale?: number;
  /** Greyed out and still, for a pet that is not unlocked yet. */
  locked?: boolean;
};

const LOCKED_COLORS = Object.fromEntries(
  Object.keys(SPRITE_COLORS).map(k => [k, k === 'O' ? '#22180F' : '#7D8A7A']),
);

/** The running-mode pet. Gallops in two frames. */
export function Gazelle({ scale = 3, locked = false }: Props) {
  const reduced = useReducedMotion();
  const tick = useTicker(180, !locked && !reduced);
  const colors = useMemo(() => (locked ? LOCKED_COLORS : SPRITE_COLORS), [locked]);
  return (
    <View importantForAccessibility="no-hide-descendants">
      <PixelArt rows={GAZELLE_FRAMES[tick % 2]} colors={colors} scale={scale} />
    </View>
  );
}
