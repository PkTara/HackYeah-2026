import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PX } from '../theme';

type Props = {
  fill: string;
  outline: string;
  /** One-pixel bevel line inside the top and bottom edges. */
  light?: string;
  shade?: string;
  /** Solid drop shadow under the box, `lift` px deep. */
  shadow?: string;
  lift?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A rectangle with stepped pixel corners. Each layer is two overlapping
 * Views (one inset left/right, one inset top/bottom), which leaves the
 * corner pixel empty. No images or SVG, so it renders the same everywhere.
 */
export function PixelBox({
  fill,
  outline,
  light,
  shade,
  shadow,
  lift = 0,
  style,
  contentStyle,
  children,
}: Props) {
  return (
    <View style={[{ marginBottom: lift }, style]}>
      {shadow && lift > 0 ? <Notched color={shadow} inset={0} dy={lift} /> : null}
      <Notched color={outline} inset={0} />
      <Notched color={fill} inset={PX} />
      {light ? <Line color={light} edge="top" /> : null}
      {shade ? <Line color={shade} edge="bottom" /> : null}
      <View style={[{ padding: PX * 4 }, contentStyle]}>{children}</View>
    </View>
  );
}

function Notched({
  color,
  inset,
  dy = 0,
}: {
  color: string;
  inset: number;
  dy?: number;
}) {
  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: inset + dy,
          bottom: inset - dy,
          left: inset + PX,
          right: inset + PX,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: inset + PX + dy,
          bottom: inset + PX - dy,
          left: inset,
          right: inset,
          backgroundColor: color,
        }}
      />
    </>
  );
}

function Line({ color, edge }: { color: string; edge: 'top' | 'bottom' }) {
  return (
    <View
      style={{
        position: 'absolute',
        [edge]: PX,
        left: PX * 2,
        right: PX * 2,
        height: PX,
        backgroundColor: color,
      }}
    />
  );
}
