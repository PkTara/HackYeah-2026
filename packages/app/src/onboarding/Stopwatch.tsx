import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatClock, formatResult, parseWholeNumber } from '@hackyeah/core';
import { AppText, Button, useTicker } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { Scoreboard } from './bits';
import { NumberField } from './NumberField';

type Props = {
  /** The time so far, in whole seconds, or null when there is none. */
  value: number | null;
  /** Called with null while timing or after a reset. */
  onChange: (seconds: number | null, method: 'stopwatch' | 'typed') => void;
  /** Longest time it accepts; the stopwatch stops by itself there. */
  max?: number;
  /** What is timed, for screen readers, e.g. "Dead hang". */
  label: string;
};

/**
 * A pixel stopwatch with big digits: Start, Stop and Reset, plus "Type it
 * in" for a time measured some other way.
 */
export function Stopwatch({ value, onChange, max = 600, label }: Props) {
  const { haptics } = useCapabilities();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState(value === null ? '' : String(value));
  const running = startedAt !== null;

  // Redraw a few times a second while it runs. The time itself comes from
  // the clock, so a slow frame never loses seconds.
  useTicker(200, running);
  const elapsed =
    startedAt === null
      ? null
      : Math.min(max, Math.floor((Date.now() - startedAt) / 1000));
  const shown = elapsed ?? value ?? 0;

  const stop = () => {
    if (startedAt === null) {
      return;
    }
    const seconds = Math.min(max, Math.floor((Date.now() - startedAt) / 1000));
    haptics.tap();
    setStartedAt(null);
    setText(String(seconds));
    onChange(seconds, 'stopwatch');
  };

  // Stops by itself at the limit.
  useEffect(() => {
    if (elapsed !== null && elapsed >= max) {
      setStartedAt(null);
      setText(String(max));
      onChange(max, 'stopwatch');
    }
  }, [elapsed, max, onChange]);

  const start = () => {
    haptics.tap();
    setStartedAt(Date.now());
    onChange(null, 'stopwatch');
  };

  const reset = () => {
    setStartedAt(null);
    setText('');
    onChange(null, 'stopwatch');
  };

  const typed = parseWholeNumber(text);
  const typedError =
    text.trim() !== '' && (typed === null || typed < 0 || typed > max)
      ? `Use a whole number from 0 to ${max}.`
      : null;

  const type = (next: string) => {
    setText(next);
    const seconds = parseWholeNumber(next);
    onChange(
      seconds !== null && seconds >= 0 && seconds <= max ? seconds : null,
      'typed',
    );
  };

  return (
    <View style={styles.root}>
      <Scoreboard
        text={formatClock(shown)}
        caption={running ? 'Timing' : value === null ? 'Min : sec' : 'Your time'}
        label={`${label} time: ${formatResult('seconds', shown)}`}
      />

      {typing ? (
        <>
          <NumberField
            label="Your time"
            unit="seconds"
            value={text}
            onChangeText={type}
            error={typedError}
            accessibilityLabel={`${label} time in seconds`}
          />
          <Button
            title="Use the timer"
            variant="secondary"
            small
            onPress={() => setTyping(false)}
          />
        </>
      ) : running ? (
        <Button title="Stop" icon="clock" onPress={stop} />
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Button
                title={value === null ? 'Start' : 'Start again'}
                icon="clock"
                onPress={start}
              />
            </View>
            <Button
              title="Reset"
              variant="secondary"
              disabled={value === null}
              onPress={reset}
            />
          </View>
          <Button
            title="Type it in"
            variant="secondary"
            small
            onPress={() => setTyping(true)}
            accessibilityHint="Enter a time you measured another way"
          />
        </>
      )}

      {/* Announced when timing starts and when it stops. */}
      <View accessibilityLiveRegion="polite">
        {running ? (
          <AppText variant="caption" muted>
            Timing. Tap Stop when you are done.
          </AppText>
        ) : value !== null && !typing ? (
          <AppText variant="caption">
            Your time: {formatResult('seconds', value)}.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
