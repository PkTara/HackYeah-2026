import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { art } from '../pixel/raster';
import { useTone } from '../tone';
import { AppText } from './AppText';
import { PixelArt } from './PixelArt';

type Props = {
  /** Defaults to "Sample data". */
  text?: string;
};

/** A dithered square: the kit's mark for data that is not the user's. */
const DITHER = art(`
  #.#.#
  .#.#.
  #.#.#
  .#.#.
  #.#.#
`);

/**
 * A quiet note that what is shown is sample data: a small dithered square
 * and one muted caption. Quieter than a Tag, so it never competes with the
 * content it describes, but still there for anyone who looks.
 */
export function SampleMark({ text = 'Sample data' }: Props) {
  const tone = useTone();
  const colors = useMemo(() => ({ '#': tone.textMuted }), [tone.textMuted]);
  return (
    <View style={styles.row}>
      <View aria-hidden importantForAccessibility="no-hide-descendants">
        <PixelArt rows={DITHER} colors={colors} scale={2} />
      </View>
      <AppText variant="caption" muted style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { flexShrink: 1 },
});
