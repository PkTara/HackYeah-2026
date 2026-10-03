import { View } from 'react-native';
import { SPRITE_COLORS, WARNING_SIGN } from '../pixel/sprites';
import { PixelArt } from './PixelArt';

/** Yellow warning triangle for safety notes. Screen readers hear "Warning". */
export function WarningSign({ scale = 3 }: { scale?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Warning">
      <PixelArt rows={WARNING_SIGN} colors={SPRITE_COLORS} scale={scale} />
    </View>
  );
}
