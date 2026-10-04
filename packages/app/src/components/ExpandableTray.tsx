import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, useTheme } from '@hackyeah/ui';

/** Optional detail stays out of the layout until the user asks for it. */
export function ExpandableTray({
  title,
  accessibilityLabel = title,
  count,
  children,
}: {
  title: string;
  accessibilityLabel?: string;
  count?: number;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  return (
    <View style={styles.tray}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => setExpanded(value => !value)}
        style={[styles.header, { borderColor: colors.outline }]}
      >
        <AppText style={styles.title}>
          {title}
          {count === undefined ? '' : ` (${count})`}
        </AppText>
        <AppText accessible={false}>{expanded ? '−' : '+'}</AppText>
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  tray: { gap: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 36,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  title: { flexShrink: 1, fontWeight: '700' },
  content: { gap: 10, paddingBottom: 4 },
});
