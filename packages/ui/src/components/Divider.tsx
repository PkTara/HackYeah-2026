import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PX, useTheme } from '../theme';

type Props = {
  /** A vertical line between side-by-side parts. */
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A pixel groove that splits one tray into linked parts: a shade line with
 * a light line beside it, in the surface colours of the day or night theme.
 * Screen readers skip it.
 */
export function Divider({ vertical = false, style }: Props) {
  const c = useTheme().colors;
  const line = vertical ? styles.vertical : styles.horizontal;
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[vertical ? styles.row : styles.column, style]}
    >
      <View style={[line, { backgroundColor: c.surfaceShade }]} />
      <View style={[line, { backgroundColor: c.surfaceLight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'stretch' },
  column: { flexDirection: 'column', alignSelf: 'stretch' },
  vertical: { width: PX, alignSelf: 'stretch' },
  horizontal: { height: PX },
});
