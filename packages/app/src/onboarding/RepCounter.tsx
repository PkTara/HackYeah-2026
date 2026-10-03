import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { parseWholeNumber } from '@hackyeah/core';
import { AppText, Button } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { Scoreboard } from './bits';
import { NumberField } from './NumberField';

type Props = {
  value: number;
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
  const [text, setText] = useState(String(value));

  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
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

  const words = describe ? describe(value) : `${value} ${unit}`;
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Button
          title="-"
          onPress={() => step(-1)}
          disabled={value <= min}
          accessibilityLabel={`One less, ${label}`}
          style={styles.key}
        />
        {/* Screen readers can also swipe up and down on the number. */}
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: words }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={event =>
            step(event.nativeEvent.actionName === 'increment' ? 1 : -1)
          }
          accessibilityLiveRegion="polite"
          style={styles.grow}
        >
          <Scoreboard
            text={min < 0 && value > 0 ? `+${value}` : String(value)}
            caption={unit}
          />
        </View>
        <Button
          title="+"
          onPress={() => step(1)}
          disabled={value >= max}
          accessibilityLabel={`One more, ${label}`}
          style={styles.key}
        />
      </View>

      {describe ? <AppText style={styles.center}>{words}</AppText> : null}

      {typing ? (
        <>
          <NumberField
            label="Type it"
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
              setText(String(value));
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

const styles = StyleSheet.create({
  root: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  key: { width: 60 },
  center: { textAlign: 'center' },
});
