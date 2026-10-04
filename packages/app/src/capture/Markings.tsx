import { StyleSheet, View } from 'react-native';
import type { OverlayPoint } from './overlay';
export const POSE_BONES = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
] as const;
export function Markings({
  points,
  prefix = 'live',
}: {
  points: readonly OverlayPoint[];
  prefix?: string;
}) {
  return (
    <>
      {POSE_BONES.map(([from, to]) => {
        const a = points.find(point => point.index === from);
        const b = points.find(point => point.index === to);
        if (!a || !b) {
          return null;
        }
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length < 1) {
          return null;
        }
        const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        return (
          <View
            key={`${from}-${to}`}
            testID={`${prefix}-bone`}
            style={[
              styles.bone,
              {
                left: (a.x + b.x - length) / 2,
                top: (a.y + b.y) / 2 - 1,
                width: length,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
      {points.map(point => (
        <View
          key={point.index}
          testID={
            prefix === 'demo' ? `demo-point-${point.index}` : 'live-landmark'
          }
          style={[styles.point, { left: point.x - 4, top: point.y - 4 }]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bone: { position: 'absolute', height: 2, backgroundColor: '#F5D78E' },
  point: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F5D78E',
  },
});
