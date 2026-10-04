import { StyleSheet, View } from 'react-native';
import { AppText, PX, useTheme } from '@hackyeah/ui';
import { READINESS_LABEL, type Readiness } from '../readiness';

/**
 * A quiet readiness state: a small square and two or three words. Green
 * for what works now, blue for the demo, banana for one step away, and a
 * hollow square for what cannot be used here.
 */
export function StateLabel({
  state,
  text,
}: {
  state: Readiness;
  /** Overrides the standard words, e.g. "Not done yet". */
  text?: string;
}) {
  const { colors: c } = useTheme();
  const fill =
    state === 'ready'
      ? c.leaf
      : state === 'demo'
      ? c.info
      : state === 'permission'
      ? c.primary
      : 'transparent';
  return (
    <View style={styles.row}>
      <View
        style={[styles.dot, { backgroundColor: fill, borderColor: c.outline }]}
      />
      <AppText variant="caption" muted>
        {text ?? READINESS_LABEL[state]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderWidth: PX - 1 },
});
