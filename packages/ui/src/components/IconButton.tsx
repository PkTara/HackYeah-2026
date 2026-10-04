import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { IconName } from '../pixel/sprites';
import { useUiSound } from '../sound';
import { PX, useTheme } from '../theme';
import { Icon } from './Icon';
import { PixelBox } from './PixelBox';

type Props = {
  icon: IconName;
  /** Icon-only, so the label is required: it is all a screen reader says. */
  accessibilityLabel: string;
  onPress: () => void;
  /** For toggles: the current state, reported to screen readers. */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Pressable state; hovered is only reported on web and desktop. */
type PressState = { pressed: boolean; hovered?: boolean };

/** The touch target is at least this many px square. */
export const ICON_BUTTON_SIZE = 44;

/**
 * Small square key with one icon, for quiet controls such as the music
 * toggle. Same look as a secondary Button: it brightens on hover and sinks
 * onto its shadow when pressed. Keyboard focus gets the same ring as every
 * other control (apps/web/index.html). The key is drawn smaller than its
 * 44 px touch target.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  selected,
  style,
}: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const playSound = useUiSound();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={[styles.target, style]}
    >
      {({ pressed, hovered }: PressState) => (
        <PixelBox
          fill={hovered ? c.surfaceLight : c.surface}
          outline={c.outline}
          light={c.surfaceLight}
          shade={c.surfaceShade}
          shadow={c.backgroundDeep}
          lift={pressed ? 0 : PX}
          style={pressed ? styles.down : null}
          contentStyle={{ padding: PX * 2 }}
        >
          <Icon name={icon} color={c.text} />
        </PixelBox>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  down: { marginTop: PX },
});
