import { Pressable, StyleSheet, View } from 'react-native';
import { useUiSound } from '../sound';
import { PX, useTheme } from '../theme';
import { useTone } from '../tone';
import { PixelText } from './PixelText';

type Props = {
  /** What a screen reader says, e.g. "Why: Focus". */
  accessibilityLabel: string;
  onPress: () => void;
  accessibilityHint?: string;
};

/** Pressable state; hovered and focused are only reported on the web. */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/**
 * A small superscript question mark in the pixel font, placed beside a
 * generated value. It is drawn small so it does not compete with the value,
 * and its touch target is padded out to 44 px. Hover, focus and press put a
 * little sign behind the glyph so it reads as a control.
 */
export function HelpMark({
  accessibilityLabel,
  onPress,
  accessibilityHint,
}: Props) {
  const c = useTheme().colors;
  const tone = useTone();
  const playSound = useUiSound();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
      style={styles.target}
    >
      {({ pressed, hovered, focused }: PressState) => {
        const lit = pressed || hovered || focused;
        return (
          <View
            style={[
              styles.mark,
              lit
                ? { backgroundColor: c.surfaceShade, borderColor: c.outline }
                : { borderColor: tone.textMuted },
              pressed ? styles.down : null,
            ]}
          >
            <PixelText
              text="?"
              color={lit ? c.text : tone.text}
              accessible={false}
            />
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { alignSelf: 'flex-start', marginTop: -PX },
  mark: {
    width: 20,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dotted',
  },
  down: { transform: [{ translateY: 1 }] },
});
