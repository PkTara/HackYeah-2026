/** Small pieces the onboarding steps share. */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Icon,
  PX,
  PixelBox,
  PixelText,
  useReducedMotion,
  useTicker,
  useTheme,
} from '@hackyeah/ui';

/** Unlit digits on the dark scoreboard. */
const DIM_DIGITS = '#6E5A2A';
/** Digit size on the scoreboard, in device pixels per art pixel. */
const BOARD_SCALE = 7;
/** How long the typing caret stays on, then off. */
const CARET_MS = 530;

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
 *
 * While `editing`, it sinks onto its shadow with a banana outline and a
 * blinking block caret after the digits, so the number reads as typed into.
 */
export function Scoreboard({
  text,
  label,
  caption,
  dim = false,
  editing = false,
}: {
  text: string;
  label?: string;
  caption?: string;
  /** Dim digits for "nothing entered yet". */
  dim?: boolean;
  editing?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <PixelBox
      fill={c.outline}
      outline={editing ? c.primary : c.outline}
      shadow={c.backgroundDeep}
      lift={editing ? 0 : PX}
      style={editing ? styles.sunk : null}
      contentStyle={styles.boardInner}
    >
      <View
        accessible={Boolean(label)}
        accessibilityRole={label ? 'text' : undefined}
        accessibilityLabel={label}
        importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
        style={styles.boardText}
      >
        <View>
          <PixelText
            text={text}
            scale={BOARD_SCALE}
            color={dim ? DIM_DIGITS : c.primary}
            accessible={false}
          />
          {/* Hangs off the right edge, so the digits never move. */}
          {editing ? <Caret color={c.primary} /> : null}
        </View>
        {caption ? (
          <PixelText text={caption} color="#E8CFA6" accessible={false} />
        ) : null}
      </View>
    </PixelBox>
  );
}

/** A block caret one digit tall. It holds still when the OS asks for less motion. */
function Caret({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const tick = useTicker(CARET_MS, !reduced);
  const on = reduced || tick % 2 === 0;
  return (
    <View
      testID="scoreboard-caret"
      style={[styles.caret, on ? { backgroundColor: color } : null]}
    />
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
  // Pressed in: the shadow's depth moves above the board, so nothing below shifts.
  sunk: { marginTop: PX },
  caret: {
    position: 'absolute',
    left: '100%',
    top: 0,
    marginLeft: BOARD_SCALE,
    width: BOARD_SCALE * 3,
    height: BOARD_SCALE * 7,
  },
});
