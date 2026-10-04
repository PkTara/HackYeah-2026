import { Pressable, StyleSheet, View } from 'react-native';
import { parseWholeNumber, type ResultMethod } from '@hackyeah/core';
import { AppText, PX, PixelBox, PixelText, useTheme } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { BoardInput, useBoardEntry } from './BoardInput';
import { Scoreboard } from './bits';

type Props = {
  /** null until the climber counts or types something. */
  value: number | null;
  /** How `value` was measured, so Escape can put it back as it was. */
  method?: ResultMethod;
  /** null only when Escape puts back "not counted yet". */
  onChange: (value: number | null, method: ResultMethod) => void;
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
 * A big pixel number with minus and plus keys. Tapping the number types
 * straight into it, for larger counts. Below zero is allowed when `min` is
 * negative.
 *
 * It starts at "not counted yet" (a dim 0) rather than a real 0, so tapping
 * past it never saves a result nobody measured. Minus on that first 0 logs a
 * real 0 when 0 is the lowest value.
 */
export function RepCounter({
  value,
  method,
  onChange,
  min,
  max,
  unit,
  label,
  describe,
}: Props) {
  const { colors: c } = useTheme();
  const { haptics } = useCapabilities();
  const shown = value ?? 0;
  const entry = useBoardEntry({
    value,
    method,
    onChange,
    read: text => {
      if (text === '' || text === '-') {
        return null;
      }
      const n = parseWholeNumber(text);
      return n !== null && n >= min && n <= max
        ? n
        : `Use a whole number from ${min} to ${max}.`;
    },
  });

  const step = (delta: number) => {
    entry.clearError();
    const next = Math.max(min, Math.min(max, shown + delta));
    if (next !== value) {
      haptics.tap();
      onChange(next, 'counter');
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
  const idle = min < 0 && shown > 0 ? `+${shown}` : String(shown);
  // Until a digit is typed the old number stays, dim, like it is selected.
  const typing = entry.draft !== null && entry.draft !== '';

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <CounterKey
          glyph="-"
          onPress={() => step(-1)}
          disabled={value !== null && value <= min}
          accessibilityLabel={`One less, ${label}`}
        />
        <View style={styles.grow}>
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
          >
            <Scoreboard
              text={typing ? entry.draft ?? '' : idle}
              caption={unit}
              dim={typing ? false : value === null || entry.editing}
              editing={entry.editing}
            />
          </View>
          <BoardInput
            draft={entry.draft}
            onBegin={entry.begin}
            onChangeText={entry.change}
            onEnd={entry.end}
            allowNegative={min < 0}
            maxLength={Math.max(String(min).length, String(max).length)}
            placeholder={words}
            accessibilityLabel={`${label}, ${unit}, tap to type`}
            accessibilityHint={`Type a whole number from ${min} to ${max}`}
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

      <View accessibilityLiveRegion="polite">
        {entry.error ? (
          <AppText
            variant="caption"
            style={[styles.center, { color: c.danger }]}
          >
            {entry.error}
          </AppText>
        ) : entry.editing ? null : (
          <AppText variant="caption" muted style={styles.center}>
            Tap the number to type it
          </AppText>
        )}
      </View>
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
