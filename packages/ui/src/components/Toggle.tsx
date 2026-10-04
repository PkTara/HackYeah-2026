import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useUiSound } from '../sound';
import { PX, useTheme } from '../theme';
import { AppText } from './AppText';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

type Props = {
  /** Shown in the pixel font, and what screen readers call the switch. */
  name: string;
  /** Plain words under the name. */
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

/** Pressable state; hovered is only reported on web and desktop. */
type PressState = { pressed: boolean; hovered?: boolean };

const KNOB = PX * 5;

/**
 * An on/off switch for settings: a name, a line of detail and a pixel
 * slider that says ON or OFF, so the state never rests on colour alone.
 * The whole row is one target. Screen readers hear a switch with its name
 * and whether it is on.
 *
 * The click plays after the change, so turning sound effects off is silent
 * and turning them on is heard.
 */
export function Toggle({ name, detail, value, onValueChange, style }: Props) {
  const c = useTheme().colors;
  const playSound = useUiSound();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={name}
      accessibilityHint={detail}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => {
        onValueChange(!value);
        playSound('tap');
      }}
      style={[styles.row, style]}
    >
      {(state: PressState) => (
        <View
          style={[
            styles.inner,
            state.pressed
              ? { backgroundColor: c.surfaceShade }
              : state.hovered
                ? { backgroundColor: c.surfaceLight }
                : null,
          ]}
        >
          <View style={styles.text}>
            <PixelText text={name} accessible={false} />
            {detail ? (
              <AppText variant="caption" muted>
                {detail}
              </AppText>
            ) : null}
          </View>
          <PixelBox
            fill={value ? c.primary : c.surfaceShade}
            outline={c.outline}
            contentStyle={[styles.track, value ? styles.on : styles.off]}
          >
            <PixelText
              text={value ? 'ON' : 'OFF'}
              color={value ? c.onPrimary : c.text}
              accessible={false}
            />
            <View
              style={[
                styles.knob,
                { backgroundColor: c.surface, borderColor: c.outline },
              ]}
            />
          </PixelBox>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 44, justifyContent: 'center' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  text: { flex: 1, gap: 2 },
  track: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: PX,
    paddingHorizontal: PX * 2,
  },
  // The knob sits on the right when on, like a light switch.
  on: { flexDirection: 'row' },
  off: { flexDirection: 'row-reverse' },
  knob: { width: KNOB, height: KNOB, borderWidth: PX - 1 },
});
