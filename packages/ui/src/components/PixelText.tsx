import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { textRows } from '../pixel/font';
import { useTone } from '../tone';
import { PixelArt } from './PixelArt';

type Props = {
  text: string;
  /** 2 is the normal label size (14px tall glyphs), 3+ for headings. */
  scale?: number;
  color?: string;
  /** Hard drop shadow one art pixel down-right. */
  shadow?: string;
  heading?: boolean;
  /** Set false inside a control that already has an accessibilityLabel. */
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bitmap text. Screen readers get the plain string through accessibilityLabel,
 * so keep `text` readable (no decorative symbols).
 */
export function PixelText({
  text,
  scale = 2,
  color,
  shadow,
  heading = false,
  accessible = true,
  style,
}: Props) {
  const tone = useTone();
  const rows = textRows(text);
  const ink = color ?? tone.text;
  const inkColors = useMemo(() => ({ '#': ink }), [ink]);
  const shadowColors = useMemo(() => ({ '#': shadow ?? '' }), [shadow]);
  const offset = shadow ? scale : 0;
  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? (heading ? 'header' : 'text') : undefined}
      accessibilityLabel={accessible ? text : undefined}
      importantForAccessibility={accessible ? 'auto' : 'no-hide-descendants'}
      style={[
        {
          width: rows[0].length * scale + offset,
          height: rows.length * scale + offset,
        },
        style,
      ]}
    >
      {shadow ? (
        <PixelArt
          rows={rows}
          colors={shadowColors}
          scale={scale}
          style={{ position: 'absolute', left: offset, top: offset }}
        />
      ) : null}
      <PixelArt rows={rows} colors={inkColors} scale={scale} />
    </View>
  );
}
