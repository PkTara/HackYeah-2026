import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Icon,
  PX,
  PixelArt,
  useTheme,
  useTone,
  useUiSound,
  type IconName,
} from '@hackyeah/ui';
import type { Readiness } from '../readiness';
import { StateLabel } from './StateLabel';

/** The breadcrumb chevron, so a row that opens a page reads like a link. */
const CHEVRON = ['##...', '.##..', '..##.', '...##', '..##.', '.##..', '##...'];

/**
 * One input or record in a list: what it is, its latest value and, when it
 * matters, whether it can be used here. The whole row opens its page. A row
 * without onPress cannot be used now and reads as plain, muted text.
 */
export function DataRow({
  title,
  subtitle,
  action = 'Open',
  accessibilityLabel,
  onPress,
  state,
  stateText,
  icon,
  divider = true,
  children,
}: {
  title: string;
  subtitle: string;
  /** Shown next to the chevron when it says more than "Open", e.g. "Redo". */
  action?: string;
  accessibilityLabel: string;
  onPress?: () => void;
  state?: Readiness;
  /** Overrides the state's standard words. */
  stateText?: string;
  icon?: IconName;
  /** A line under the row; off for the last row of a list. */
  divider?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const tone = useTone();
  const playSound = useUiSound();
  const usable = Boolean(onPress);
  const body = (hovered: boolean, pressed: boolean) => (
    <View
      style={[
        styles.row,
        divider ? { borderBottomColor: colors.surfaceShade } : styles.last,
        pressed
          ? { backgroundColor: colors.surfaceShade }
          : hovered
          ? { backgroundColor: colors.surfaceLight }
          : null,
      ]}
    >
      {icon ? (
        <Icon name={icon} color={usable ? tone.text : tone.textMuted} />
      ) : null}
      <View style={styles.copy}>
        <AppText muted={!usable} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" muted>
          {subtitle}
        </AppText>
        {children}
      </View>
      <View style={styles.end}>
        {state ? <StateLabel state={state} text={stateText} /> : null}
        {usable && action !== 'Open' ? (
          <AppText variant="caption" style={styles.action}>
            {action}
          </AppText>
        ) : null}
        {usable ? (
          <PixelArt
            rows={CHEVRON}
            colors={{ '#': tone.text }}
            scale={2}
            style={styles.chevron}
          />
        ) : null}
      </View>
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${title}. ${subtitle}`}>
        {body(false, false)}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={subtitle}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
    >
      {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) =>
        body(Boolean(hovered), pressed)
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderBottomWidth: PX,
  },
  last: { borderBottomWidth: 0, borderBottomColor: 'transparent' },
  copy: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  end: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  action: { fontWeight: '800' },
  chevron: { marginLeft: 2 },
});
