import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { parseWholeNumber } from '@hackyeah/core';
import { AppText, Button, PX, PixelBox, PixelText, useTheme } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { Scoreboard } from './bits';
import { NumberField } from './NumberField';

type Props = {
  /** null until the climber counts or types something. */
  value: number | null;
  onChange: (value: number, method: 'counter' | 'typed') => void;
  min: number;
  max: number;
  /** Word under the number, e.g. "reps" or "cm". */
  unit: string;
  /** What is counted, for screen readers, e.g. "Pull-ups". */
  label: string;
  /** The value in plain words, shown under the board, e.g. "4 cm past your toes". */
  describe?: (value: number) => string;
};

/**
 * A big pixel number with minus and plus keys, plus "Type it in" for larger
 * counts. Below zero is allowed when `min` is negative.
 *
 * It starts at "not counted yet" (a dim 0) rather than a real 0, so tapping
 * past it never saves a result nobody measured. Minus on that first 0 logs a
 * real 0 when 0 is the lowest value.
 */
export function RepCounter({
  value,
  onChange,
  min,
  max,
  unit,
  label,
  describe,
}: Props) {
  const { haptics } = useCapabilities();
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState(value === null ? '' : String(value));
  const shown = value ?? 0;

  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, shown + delta));
    if (next !== value) {
      haptics.tap();
      setText(String(next));
      onChange(next, 'counter');
    }
  };

  const typed = parseWholeNumber(text);
  const typedError =
    typed === null || typed < min || typed > max
      ? `Use a whole number from ${min} to ${max}.`
      : null;
  const type = (next: string) => {
    setText(next);
    const n = parseWholeNumber(next);
    if (n !== null && n >= min && n <= max) {
      onChange(n, 'typed');
    }
  };

  const words =
    value === null
      ? 'Not counted yet'
      : describe
        ? describe(value)
        : `${value} ${unit}`;
  const hint =
    value !== null
      ? null
      : min === 0
        ? 'Could not do one? That is fine, tap minus to log 0.'
        : 'Tap plus for past your toes, minus for short of them.';

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <CounterKey
          glyph="-"
          onPress={() => step(-1)}
          disabled={value !== null && value <= min}
          accessibilityLabel={`One less, ${label}`}
        />
        {/* Screen readers can also swipe up and down on the number. */}
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: shown, text: words }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={event =>
            step(event.nativeEvent.actionName === 'increment' ? 1 : -1)
          }
          accessibilityLiveRegion="polite"
          style={styles.grow}
        >
          <Scoreboard
            text={min < 0 && shown > 0 ? `+${shown}` : String(shown)}
            caption={unit}
            dim={value === null}
          />
        </View>
        <CounterKey
          glyph="+"
          onPress={() => step(1)}
          disabled={value !== null && value >= max}
          accessibilityLabel={`One more, ${label}`}
        />
      </View>

      {describe || hint ? (
        <AppText style={styles.center} muted={value === null}>
          {hint ?? words}
        </AppText>
      ) : null}

      {typing ? (
        <>
          <NumberField
            label="Number"
            unit={unit}
            value={text}
            onChangeText={type}
            error={text.trim() === '' ? null : typedError}
            allowNegative={min < 0}
            accessibilityLabel={`${label} in ${unit}`}
          />
          <Button
            title="Use the buttons"
            variant="secondary"
            small
            onPress={() => {
              setTyping(false);
              setText(value === null ? '' : String(value));
            }}
          />
        </>
      ) : (
        <Button
          title="Type it in"
          variant="secondary"
          small
          onPress={() => setTyping(true)}
          accessibilityHint="Enter the number with the keyboard"
        />
      )}
    </View>
  );
}

/**
 * A big square key with a chunky plus or minus, sinking onto its shadow
 * when pressed like the kit's Button.
 */
function CounterKey({
  glyph,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  glyph: '+' | '-';
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel: string;
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
    >
      {({ pressed }) => {
        const down = pressed || disabled;
        // Pressed, it drops onto its shadow.
        const sink = { marginTop: down ? PX * 2 : 0 };
        return (
          <PixelBox
            fill={disabled ? c.surfaceShade : c.primary}
            outline={c.outline}
            light={disabled ? undefined : '#FFE58A'}
            shade={disabled ? undefined : c.primaryShade}
            shadow={c.backgroundDeep}
            lift={down ? 0 : PX * 2}
            style={sink}
            contentStyle={styles.key}
          >
            <PixelText
              text={glyph}
              scale={5}
              color={disabled ? c.textMuted : c.onPrimary}
              accessible={false}
            />
          </PixelBox>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  key: {
    width: 60,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
