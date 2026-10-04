import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  clockFromDigits,
  formatClock,
  formatResult,
  secondsFromClockDigits,
  type ResultMethod,
} from '@hackyeah/core';
import { AppText, Button, useTheme, useTicker } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { BoardInput, useBoardEntry } from './BoardInput';
import { Scoreboard } from './bits';

type Props = {
  /** The time so far, in whole seconds, or null when there is none. */
  value: number | null;
  /** How `value` was measured, so Escape can put it back as it was. */
  method?: ResultMethod;
  /** Called with null while timing or after a reset. */
  onChange: (seconds: number | null, method: ResultMethod) => void;
  /** Longest time it accepts; the stopwatch stops by itself there. */
  max?: number;
  /** What is timed, for screen readers, e.g. "Dead hang". */
  label: string;
};

/**
 * A pixel stopwatch with big digits: Start, Stop and Reset. Tapping the
 * clock while it is stopped types a time measured some other way, filled
 * in from the right like a microwave: 1, 2, 5 is 1:25.
 */
export function Stopwatch({ value, method, onChange, max = 600, label }: Props) {
  const { colors: c } = useTheme();
  const { haptics } = useCapabilities();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const running = startedAt !== null;
  const entry = useBoardEntry({
    value,
    method,
    onChange,
    read: digits => {
      const seconds = secondsFromClockDigits(digits);
      return seconds === null || seconds <= max
        ? seconds
        : `Use a time up to ${formatClock(max)}.`;
    },
  });

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
    onChange(seconds, 'stopwatch');
  };

  // Stops by itself at the limit.
  useEffect(() => {
    if (elapsed !== null && elapsed >= max) {
      setStartedAt(null);
      onChange(max, 'stopwatch');
    }
  }, [elapsed, max, onChange]);

  const start = () => {
    haptics.tap();
    entry.clearError();
    setStartedAt(Date.now());
    onChange(null, 'stopwatch');
  };

  const reset = () => {
    entry.clearError();
    setStartedAt(null);
    onChange(null, 'stopwatch');
  };

  // Until a digit is typed the old time stays, dim, like it is selected.
  const typing = entry.draft !== null && entry.draft !== '';

  return (
    <View style={styles.root}>
      <View>
        <Scoreboard
          text={typing ? clockFromDigits(entry.draft ?? '') : formatClock(shown)}
          caption={
            running
              ? 'Timing'
              : value === null || entry.editing
                ? 'Min : sec'
                : 'Your time'
          }
          label={`${label} time: ${formatResult('seconds', shown)}`}
          dim={typing ? false : !running && (value === null || entry.editing)}
          editing={entry.editing}
        />
        {/* While it runs the clock is not for typing. */}
        {running ? null : (
          <BoardInput
            draft={entry.draft}
            onBegin={entry.begin}
            onChangeText={entry.change}
            onEnd={entry.end}
            maxLength={4}
            placeholder={
              value === null ? 'No time yet' : formatResult('seconds', value)
            }
            accessibilityLabel={`${label} time, tap to type`}
            accessibilityHint="Type minutes and seconds, for example 1 2 5 for 1:25"
          />
        )}
      </View>

      <View accessibilityLiveRegion="polite">
        {entry.error ? (
          <AppText variant="caption" style={[styles.center, { color: c.danger }]}>
            {entry.error}
          </AppText>
        ) : running || entry.editing ? null : (
          <AppText variant="caption" muted style={styles.center}>
            Tap the time to type it
          </AppText>
        )}
      </View>

      {running ? (
        <Button title="Stop" icon="clock" onPress={stop} />
      ) : (
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
      )}

      {/* Announced when timing starts and when it stops. */}
      <View accessibilityLiveRegion="polite">
        {running ? (
          <AppText variant="caption" muted>
            Timing. Tap Stop when you are done.
          </AppText>
        ) : value !== null && !entry.editing ? (
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
  center: { textAlign: 'center' },
});
