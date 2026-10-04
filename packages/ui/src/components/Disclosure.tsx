import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useUiSound } from '../sound';
import { PX, useTheme } from '../theme';
import { useTone } from '../tone';
import { AppText } from './AppText';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

type Props = {
  title: string;
  /** Muted text after the title, such as "9 records". */
  note?: string;
  /** Defaults to the title, plus the note. */
  accessibilityLabel?: string;
  initiallyOpen?: boolean;
  children: ReactNode;
};

/** Pressable state; hovered and focused are only reported on the web. */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/**
 * Optional detail that stays folded away until asked for: a pixel heading
 * with a small plus or minus key. Screen readers hear a button that is
 * expanded or collapsed.
 */
export function Disclosure({
  title,
  note,
  accessibilityLabel,
  initiallyOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const c = useTheme().colors;
  const tone = useTone();
  const playSound = useUiSound();
  return (
    <View style={styles.stack}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? (note ? `${title}, ${note}` : title)
        }
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => {
          playSound('tap');
          setOpen(value => !value);
        }}
        style={styles.header}
      >
        {({ pressed, hovered }: PressState) => (
          <>
            <PixelBox
              fill={hovered ? c.surfaceLight : c.surface}
              outline={c.outline}
              shade={c.surfaceShade}
              shadow={c.backgroundDeep}
              lift={pressed ? 0 : PX}
              style={pressed ? styles.sunk : null}
              contentStyle={styles.key}
            >
              <PixelText
                text={open ? '-' : '+'}
                color={c.text}
                accessible={false}
              />
            </PixelBox>
            <View style={styles.title}>
              <PixelText text={title} wrap accessible={false} />
              {note ? (
                <AppText variant="caption" muted>
                  {note}
                </AppText>
              ) : null}
            </View>
          </>
        )}
      </Pressable>
      {open ? (
        <View style={[styles.content, { borderColor: tone.textMuted }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  key: {
    width: 26,
    height: 26,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunk: { marginTop: PX },
  title: { flex: 1, gap: 2 },
  content: { gap: 10, paddingLeft: 12, borderLeftWidth: PX },
});
