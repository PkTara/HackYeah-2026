import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { AppText, PX, PixelText, useTheme } from '@hackyeah/ui';

type Props = {
  /** Shown above the box, e.g. "Height". */
  label: string;
  /** Shown after the label, e.g. "cm". */
  unit: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  /** Lets the keyboard type a minus sign. */
  allowNegative?: boolean;
  maxLength?: number;
  /** Read by screen readers, e.g. "Height in cm". */
  accessibilityLabel: string;
  onSubmit?: () => void;
};

/**
 * Number box in the pixel style: hard outline, square corners, big digits.
 * It turns banana yellow while you type in it.
 */
export function NumberField({
  label,
  unit,
  value,
  onChangeText,
  error,
  allowNegative = false,
  maxLength = 3,
  accessibilityLabel,
  onSubmit,
}: Props) {
  const { colors: c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {/* The input carries its own label for screen readers. */}
      <PixelText text={`${label} (${unit})`} accessible={false} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={
          allowNegative
            ? Platform.OS === 'ios'
              ? 'numbers-and-punctuation'
              : 'numeric'
            : 'number-pad'
        }
        returnKeyType="done"
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel}
        selectionColor={c.outline}
        style={[
          styles.input,
          {
            backgroundColor: focused ? c.primary : c.surfaceLight,
            borderColor: error ? c.danger : c.outline,
            color: focused ? c.onPrimary : c.text,
          },
        ]}
      />
      <View accessibilityLiveRegion="polite">
        {error ? (
          <AppText variant="caption" style={{ color: c.danger }}>
            {error}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, gap: 6 },
  input: {
    minHeight: 48,
    borderWidth: PX,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 20,
    fontWeight: '800',
  },
});
