/** Small pieces the onboarding steps share. */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Icon,
  PX,
  PixelBox,
  PixelText,
  useTheme,
} from '@hackyeah/ui';

/** A banana square with a pixel number, for numbered lists. */
export function NumberBadge({ n }: { n: number }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: c.primary, borderColor: c.outline }]}
    >
      <PixelText text={String(n)} color={c.onPrimary} accessible={false} />
    </View>
  );
}

/** Numbered lines. Screen readers hear the number before each line. */
export function NumberedList({ items }: { items: readonly ReactNode[] }) {
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <NumberBadge n={i + 1} />
          <View style={styles.grow}>
            {typeof item === 'string' ? (
              <AppText accessibilityLabel={`${i + 1}. ${item}`}>{item}</AppText>
            ) : (
              item
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/** One plain safety line with a little warning flag. */
export function SafetyLine({ text }: { text: string }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={[
        styles.safety,
        { backgroundColor: c.dangerSoft, borderColor: c.outline },
      ]}
    >
      <Icon name="flag" />
      <AppText variant="caption" style={styles.grow}>
        {text}
      </AppText>
    </View>
  );
}

/** A caption label and its value, e.g. on the summary. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      {typeof children === 'string' ? <AppText>{children}</AppText> : children}
    </View>
  );
}

/**
 * Dark scoreboard with big banana digits, for the stopwatch and counters.
 * Screen readers hear `label` instead of the digits; without a label the
 * board is left to the control around it.
 */
export function Scoreboard({
  text,
  label,
  caption,
}: {
  text: string;
  label?: string;
  caption?: string;
}) {
  const { colors: c } = useTheme();
  return (
    <PixelBox
      fill={c.outline}
      outline={c.outline}
      shadow={c.backgroundDeep}
      lift={PX}
      contentStyle={styles.boardInner}
    >
      <View
        accessible={Boolean(label)}
        accessibilityRole={label ? 'text' : undefined}
        accessibilityLabel={label}
        importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
        style={styles.boardText}
      >
        <PixelText text={text} scale={7} color={c.primary} accessible={false} />
        {caption ? (
          <PixelText text={caption} color="#E8CFA6" accessible={false} />
        ) : null}
      </View>
    </PixelBox>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 26,
    height: 26,
    borderWidth: PX - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  grow: { flex: 1 },
  safety: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: PX - 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  fact: { gap: 2 },
  boardInner: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  boardText: { alignItems: 'center', gap: 8 },
});
