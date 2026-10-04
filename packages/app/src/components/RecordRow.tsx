import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { EvidenceRecord } from '@hackyeah/core';
import {
  AppText,
  Icon,
  PX,
  PixelText,
  Tag,
  isIconName,
  useTheme,
} from '@hackyeah/ui';

const BADGE = 46;
const GAP = 10;

/**
 * One record as a short row: a badge (grade, distance) or an icon, two lines
 * of words, the date and an outcome stamp. The Log lists, the Evidence pages
 * and the Why? inputs all draw records with it. Records without a drawn
 * form, such as server snapshots, show their label and detail. Either way a
 * screen reader hears the full label and detail.
 *
 * `action` (a Remove button, say) sits under the words, outside the spoken
 * row so it stays its own control. `highlight` frames the row in leaf green,
 * for the record that was just saved.
 */
export function RecordRow({
  record,
  action,
  highlight = false,
  testID,
}: {
  record: EvidenceRecord;
  action?: ReactNode;
  highlight?: boolean;
  testID?: string;
}) {
  const c = useTheme().colors;
  const { view } = record;
  const spoken = `${highlight ? 'Just saved. ' : ''}${record.label}. ${
    record.detail
  }`;
  if (!view) {
    return (
      <View
        accessible
        accessibilityLabel={spoken}
        testID={testID}
        style={styles.plain}
      >
        <AppText variant="caption" style={styles.strong}>
          {record.label}
        </AppText>
        {record.detail ? (
          <AppText variant="caption">{record.detail}</AppText>
        ) : null}
      </View>
    );
  }
  const icon = isIconName(view.icon) ? view.icon : undefined;
  return (
    <View
      style={[
        styles.wrap,
        highlight && [
          styles.highlight,
          { borderColor: c.leaf, backgroundColor: c.surfaceLight },
        ],
      ]}
    >
      <View
        accessible
        accessibilityLabel={spoken}
        testID={testID}
        style={styles.record}
      >
        <View
          style={[
            styles.badge,
            { backgroundColor: c.surfaceShade, borderColor: c.outline },
          ]}
        >
          {view.badge ? (
            <>
              <PixelText
                text={view.badge}
                scale={view.badge.length > 2 ? 2 : 3}
                accessible={false}
              />
              {view.badgeNote ? (
                <AppText variant="caption" style={styles.badgeNote}>
                  {view.badgeNote}
                </AppText>
              ) : null}
            </>
          ) : icon ? (
            <Icon name={icon} scale={3} />
          ) : null}
        </View>
        <View style={styles.grow}>
          <View style={styles.titleRow}>
            {view.badge && icon ? <Icon name={icon} /> : null}
            <AppText variant="caption" style={[styles.strong, styles.anchor]}>
              {view.title}
            </AppText>
          </View>
          {view.note ? <AppText variant="caption">{view.note}</AppText> : null}
          {view.when ? (
            <AppText variant="caption" muted>
              {view.when}
            </AppText>
          ) : null}
        </View>
        {view.outcome ? (
          <View>
            <Tag
              text={view.outcome.text}
              tone={view.outcome.done ? 'new' : 'muted'}
            />
          </View>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  highlight: { borderWidth: PX, padding: 6 },
  plain: { gap: 2 },
  record: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  badge: {
    width: BADGE,
    minHeight: BADGE,
    borderWidth: PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNote: { lineHeight: 14 },
  grow: { flex: 1 },
  anchor: { flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  action: { flexDirection: 'row', marginLeft: BADGE + GAP },
  strong: { fontWeight: '800' },
});
