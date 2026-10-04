import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  MIN_LOGS,
  explainMovement,
  styleSummary,
  type ClimbLog,
  type Movement,
} from '@hackyeah/core';
import {
  AppText,
  PX,
  PixelText,
  ShareBar,
  useTheme,
  useUiSound,
} from '@hackyeah/ui';
import { MOVEMENT_NAME } from '../labels';
import { ExplanationSheet } from './DecisionHelp';

/**
 * The style list on Profile: one fixed-height row per style you have
 * logged, most logged first, and one quiet line for the rest. The row does
 * not grow with the number of climbs: a bar shows the share sent and the
 * count sits at the end. The whole row opens the style's WHY? sheet.
 */
export function StyleTallies({ logs }: { logs: readonly ClimbLog[] }) {
  const { logged, empty } = styleSummary(logs);
  const [open, setOpen] = useState<Movement | null>(null);
  return (
    <View style={styles.stack}>
      {logged.length === 0 ? (
        <AppText variant="caption">
          No styles logged yet. Pick one or more styles when you log a climb.
        </AppText>
      ) : (
        <View>
          {logged.map(({ movement, tally }) => (
            <StyleRow
              key={movement}
              name={MOVEMENT_NAME[movement]}
              sent={tally.sent}
              logged={tally.logged}
              share={tally.rate}
              onPress={() => setOpen(movement)}
            />
          ))}
        </View>
      )}
      {empty.length > 0 && logged.length > 0 ? (
        <AppText variant="caption" muted testID="styles-not-logged">
          {`Not logged yet: ${empty
            .map(m => MOVEMENT_NAME[m].toLowerCase())
            .join(', ')}.`}
        </AppText>
      ) : null}
      {logged.length > 0 ? (
        <AppText variant="caption" muted>
          {`The bar is the share you sent. A dashed bar has fewer than ${MIN_LOGS} climbs. A climb with several styles counts in each.`}
        </AppText>
      ) : null}
      {open ? (
        <ExplanationSheet
          visible
          onClose={() => setOpen(null)}
          label={`${MOVEMENT_NAME[open]} tally`}
          explanation={explainMovement(open, logs)}
        />
      ) : null}
    </View>
  );
}

function StyleRow({
  name,
  sent,
  logged,
  share,
  onPress,
}: {
  name: string;
  sent: number;
  logged: number;
  share: number | null;
  onPress: () => void;
}) {
  const c = useTheme().colors;
  const playSound = useUiSound();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Why: ${name} tally`}
      accessibilityValue={{ text: `${sent} of ${logged} sent` }}
      accessibilityHint="Shows the climbs and the rule behind this count"
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.row,
        pressed || hovered ? { backgroundColor: c.surfaceShade } : null,
      ]}
    >
      <View style={styles.name}>
        <PixelText text={name} accessible={false} />
      </View>
      <ShareBar share={share} />
      <AppText variant="caption" style={styles.count}>
        {sent}/{logged}
      </AppText>
      <View style={[styles.mark, { borderColor: c.textMuted }]}>
        <PixelText text="?" color={c.textMuted} accessible={false} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 4,
  },
  name: { width: 124 },
  count: { width: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
  mark: {
    borderWidth: PX - 2,
    borderStyle: 'dotted',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
});
