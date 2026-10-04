import { StyleSheet, View } from 'react-native';
import { LEG_PARTS, type Side } from '@hackyeah/core';
import {
  AppText,
  Chip,
  Column,
  Columns,
  Gazelle,
  Panel,
  PixelText,
  WarningSign,
} from '@hackyeah/ui';
import { PageHeader } from '../../components/PageHeader';
import { TabScreen } from '../../components/TabScreen';
import { LEG_PART_NAME, SIDE_NAME, legFlagText, legLabel } from '../../labels';
import { useRun } from '../../state/RunProvider';

const SIDES: readonly Side[] = ['left', 'right'];

/**
 * The gazelle's version of the Hands tab: mark where a leg is sore. A flag
 * pauses running quests and offers a check-in instead. It is the runner's own
 * note, not a diagnosis, and never changes the running profile.
 */
export function LegsScreen() {
  const { state, today, setLegFlag } = useRun();
  const flagged = (side: Side, part: (typeof LEG_PARTS)[number]) =>
    state.legFlags.some(f => f.side === side && f.part === part);

  return (
    <TabScreen>
      <PageHeader
        title="Legs"
        subtitle="Tap anywhere that is sore. The gazelle eases off until you clear it."
      />

      <Columns>
        {SIDES.map(side => (
          <Column key={side}>
            <Panel title={`${SIDE_NAME[side]} leg`}>
              <View style={styles.grid}>
                {LEG_PARTS.map(part => (
                  <View key={part} style={styles.cell}>
                    <Chip
                      label={LEG_PART_NAME[part]}
                      selected={flagged(side, part)}
                      accessibilityLabel={`${legLabel(side, part)}${
                        flagged(side, part) ? ', flagged' : ''
                      }`}
                      onPress={() =>
                        setLegFlag(side, part, !flagged(side, part))
                      }
                    />
                  </View>
                ))}
              </View>
            </Panel>
          </Column>
        ))}
      </Columns>

      <Panel variant={state.legFlags.length > 0 ? 'alert' : 'quiet'}>
        {state.legFlags.length === 0 ? (
          <View style={styles.inline}>
            <Gazelle scale={2} still />
            <AppText style={styles.grow}>
              Nothing flagged. Every quest is open.
            </AppText>
          </View>
        ) : (
          <>
            <PixelText text="Flagged" />
            {state.legFlags.map(f => (
              <AppText key={`${f.side}-${f.part}`}>
                {legFlagText(f, today)}
              </AppText>
            ))}
            <AppText variant="caption" muted>
              Running quests are paused. Tap a spot again to clear it.
            </AppText>
          </>
        )}
      </Panel>

      <Panel variant="quiet">
        <View style={styles.note}>
          <WarningSign />
          <AppText variant="caption" style={styles.grow}>
            Sharp pain, swelling, or pain that stays when you rest needs a
            doctor or physio, not a quest.
          </AppText>
        </View>
      </Panel>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexBasis: '45%', flexGrow: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
});
