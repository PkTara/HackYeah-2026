import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { IconName } from '../pixel/sprites';
import { PX, useTheme } from '../theme';
import { Icon } from './Icon';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  /** Smaller label and padding, for buttons inside lists. */
  small?: boolean;
  /** Defaults to the title. Set it when several buttons share a title. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const LIFT = PX * 2;

/** Pressable state; hovered is only reported on web and desktop. */
type PressState = { pressed: boolean; hovered?: boolean };

/**
 * Chunky game button. It sits on a solid shadow and drops onto it when
 * pressed, like a real key.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  small = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const fill = disabled
    ? c.surfaceShade
    : variant === 'primary'
      ? c.primary
      : variant === 'danger'
        ? c.danger
        : c.surface;
  const light = disabled
    ? undefined
    : variant === 'primary'
      ? '#FFE58A'
      : variant === 'danger'
        ? '#E8705C'
        : c.surfaceLight;
  const shade = disabled
    ? undefined
    : variant === 'primary'
      ? c.primaryShade
      : variant === 'danger'
        ? '#8F2618'
        : c.surfaceShade;
  const ink = disabled
    ? c.textMuted
    : variant === 'primary'
      ? c.onPrimary
      : variant === 'danger'
        ? c.onDanger
        : c.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={style}
    >
      {(state: PressState) => {
        const down = state.pressed || disabled;
        // On hover the key brightens to its bevel colour.
        const lit = Boolean(state.hovered) && !disabled;
        return (
          <PixelBox
            fill={lit && light ? light : fill}
            outline={c.outline}
            light={light}
            shade={shade}
            shadow={c.backgroundDeep}
            lift={down ? 0 : LIFT}
            style={{ marginTop: down ? LIFT : 0 }}
            contentStyle={{
              minHeight: small ? 40 : 50,
              paddingVertical: small ? 8 : 12,
              paddingHorizontal: small ? 12 : 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {icon ? <Icon name={icon} color={ink} /> : null}
            <View>
              <PixelText text={title} color={ink} accessible={false} />
            </View>
          </PixelBox>
        );
      }}
    </Pressable>
  );
}
