import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LINE_GAP, textRows, textWidth } from '../pixel/font';
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
  /**
   * Breaks between words to fit the width it is given. For text the app
   * does not write itself, such as a quest title from the server.
   */
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The space between two words, as one line of text would draw it. */
const WORD_GAP = textWidth('I I') - 2 * textWidth('I');

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
  wrap = false,
  style,
}: Props) {
  if (wrap) {
    return (
      <View
        accessible={accessible}
        accessibilityRole={
          accessible ? (heading ? 'header' : 'text') : undefined
        }
        accessibilityLabel={accessible ? text : undefined}
        importantForAccessibility={accessible ? 'auto' : 'no-hide-descendants'}
        style={[
          {
            flexDirection: 'row',
            flexWrap: 'wrap',
            columnGap: WORD_GAP * scale,
            rowGap: LINE_GAP * scale,
          },
          style,
        ]}
      >
        {text
          .split(/\s+/)
          .filter(Boolean)
          .map((word, i) => (
            <PixelText
              key={i}
              text={word}
              scale={scale}
              color={color}
              shadow={shadow}
              accessible={false}
            />
          ))}
      </View>
    );
  }
  return (
    <PixelLine
      {...{ text, scale, color, shadow, heading, accessible, style }}
    />
  );
}

function PixelLine({
  text,
  scale = 2,
  color,
  shadow,
  heading = false,
  accessible = true,
  style,
}: Omit<Props, 'wrap'>) {
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
