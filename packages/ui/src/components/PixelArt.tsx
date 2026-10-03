import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { gridToRects } from '../pixel/raster';

type Props = {
  rows: readonly string[];
  /** Palette key -> colour. Keys without a colour are not drawn. */
  colors: Readonly<Record<string, string>>;
  /** Device pixels per art pixel. */
  scale: number;
  style?: StyleProp<ViewStyle>;
};

/** Draws a pixel picture with one View per merged rectangle. */
export const PixelArt = memo(function PixelArt({
  rows,
  colors,
  scale,
  style,
}: Props) {
  const rects = gridToRects(rows);
  const width = (rows[0]?.length ?? 0) * scale;
  const height = rows.length * scale;
  return (
    <View style={[{ width, height, pointerEvents: 'none' }, style]}>
      {rects.map((r, i) =>
        colors[r.key] ? (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: r.x * scale,
              top: r.y * scale,
              width: r.w * scale,
              height: r.h * scale,
              backgroundColor: colors[r.key],
            }}
          />
        ) : null,
      )}
    </View>
  );
});
