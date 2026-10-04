import { Pressable, View } from 'react-native';
import type { IconName } from '../pixel/sprites';
import { useUiSound } from '../sound';
import { PX, useTheme } from '../theme';
import { Icon } from './Icon';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Stack the icon above the label (for big terrain tiles). */
  tall?: boolean;
  /** Red when selected, for marking something sore. */
  warn?: boolean;
  accessibilityLabel?: string;
};

/** Toggle tile for quick picks: terrain, grade, sent or not. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  tall = false,
  warn = false,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const playSound = useUiSound();
  const fill = selected ? (warn ? c.danger : c.primary) : c.surface;
  const ink = selected ? (warn ? c.onDanger : c.onPrimary) : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // aria-selected maps to accessibilityState on native and also reaches
      // screen readers on the web.
      aria-selected={selected}
      onPress={() => {
        // Choosing gets a brighter tick than letting go.
        playSound(selected ? 'tap' : 'select');
        onPress();
      }}
      hitSlop={3}
    >
      {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
        <PixelBox
          fill={hovered && !selected ? c.surfaceLight : fill}
          outline={c.outline}
          light={selected ? undefined : c.surfaceLight}
          shade={selected ? undefined : c.surfaceShade}
          shadow={c.backgroundDeep}
          lift={pressed || selected ? 0 : PX}
          style={{ marginTop: pressed || selected ? PX : 0 }}
          contentStyle={{
            minHeight: 44,
            paddingVertical: tall ? 10 : 8,
            paddingHorizontal: 10,
            flexDirection: tall ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {icon ? <Icon name={icon} scale={tall ? 3 : 2} color={ink} /> : null}
          <View>
            <PixelText text={label} color={ink} accessible={false} />
          </View>
        </PixelBox>
      )}
    </Pressable>
  );
}
