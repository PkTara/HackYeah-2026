import { View } from 'react-native';
import { PX, useTheme } from '../theme';

type MeterProps = {
  /** Filled segments. */
  value: number;
  segments: number;
  color?: string;
  height?: number;
  accessibilityLabel: string;
};

/** Segmented bar, like a health bar. Each segment is one unit (one quest). */
export function Meter({
  value,
  segments,
  color,
  height = 18,
  accessibilityLabel,
}: MeterProps) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: segments, now: value }}
      style={{
        flexDirection: 'row',
        gap: PX,
        padding: PX,
        height: height + PX * 2,
        backgroundColor: theme.colors.outline,
      }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor:
              i < value ? color ?? theme.colors.primary : theme.colors.surfaceShade,
          }}
        >
          {i < value ? (
            <View
              style={{ height: PX, marginHorizontal: PX, marginTop: PX, backgroundColor: '#FFFFFF66' }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

type PipsProps = {
  /** One entry per logged climb: true if it was sent. */
  results: readonly boolean[];
  max?: number;
  accessibilityLabel: string;
};

/**
 * One square per logged climb, filled when it was sent. Shows the raw
 * evidence instead of a score.
 */
export function Pips({ results, max = 12, accessibilityLabel }: PipsProps) {
  const theme = useTheme();
  const shown = results.slice(-max);
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}
    >
      {shown.length === 0 ? (
        <View
          style={{
            width: 14,
            height: 14,
            borderWidth: PX - 1,
            borderStyle: 'dashed',
            borderColor: theme.colors.textMuted,
          }}
        />
      ) : null}
      {shown.map((sent, i) => (
        <View
          key={i}
          style={{
            width: 14,
            height: 14,
            borderWidth: PX - 1,
            borderColor: theme.colors.outline,
            backgroundColor: sent ? theme.colors.leafLight : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
