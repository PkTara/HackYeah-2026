import { View, type StyleProp, type ViewStyle } from 'react-native';
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
  const line = vertical ? { width: PX } : { height: PX };
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          flexDirection: vertical ? 'row' : 'column',
          alignSelf: 'stretch',
        },
        style,
      ]}
    >
      <View style={[line, vertical ? { alignSelf: 'stretch' } : null, { backgroundColor: c.surfaceShade }]} />
      <View style={[line, vertical ? { alignSelf: 'stretch' } : null, { backgroundColor: c.surfaceLight }]} />
    </View>
  );
}
