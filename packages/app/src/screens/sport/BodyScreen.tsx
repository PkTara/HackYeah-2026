import { StyleSheet, View } from 'react-native';
import type { Side } from '@hackyeah/core';
import {
  AppText,
  Chip,
  Column,
  Columns,
  Dolphin,
  Gazelle,
  Panel,
  PixelText,
  WarningSign,
} from '@hackyeah/ui';
import { PageHeader } from '../../components/PageHeader';
import { TabScreen } from '../../components/TabScreen';
import { SIDE_NAME } from '../../labels';
import { bodyFlagText, flagLabel } from '../../sports';
import { useSport } from '../../state/SportProvider';

const SIDES: readonly Side[] = ['left', 'right'];

/**
 * The sport version of the Hands tab: mark where it is sore (legs for the
 * gazelle, shoulders to ankles for the dolphin). A flag pauses quests that
 * load the body and offers a check-in instead. It is the athlete's own note,
 * not a diagnosis, and never changes the profile.
 */
export function BodyScreen() {
  const { sport, view, state, today, setFlag } = useSport();
  const flagged = (side: Side, part: string) =>
    state.flags.some(f => f.side === side && f.part === part);
  const Pet = sport.pet === 'dolphin' ? Dolphin : Gazelle;

  return (
    <TabScreen>
      <PageHeader
        title={view.bodyTab}
        subtitle={`Tap anywhere that is sore. The ${view.pet} eases off until you clear it.`}
      />

      <Columns>
        {SIDES.map(side => (
          <Column key={side}>
            <Panel title={`${SIDE_NAME[side]} side`}>
              <View style={styles.grid}>
                {sport.bodyParts.map(part => (
                  <View key={part} style={styles.cell}>
                    <Chip
                      label={view.bodyPartName[part]}
                      selected={flagged(side, part)}
                      accessibilityLabel={`${flagLabel(view, side, part)}${
                        flagged(side, part) ? ', flagged' : ''
                      }`}
                      onPress={() => setFlag(side, part, !flagged(side, part))}
                    />
                  </View>
                ))}
              </View>
            </Panel>
          </Column>
        ))}
      </Columns>

      <Panel variant={state.flags.length > 0 ? 'alert' : 'quiet'}>
        {state.flags.length === 0 ? (
          <View style={styles.inline}>
            <Pet scale={2} still />
            <AppText style={styles.grow}>
              Nothing flagged. Every quest is open.
            </AppText>
          </View>
        ) : (
          <>
            <PixelText text="Flagged" />
            {state.flags.map(f => (
              <AppText key={`${f.side}-${f.part}`}>
                {bodyFlagText(view, f, today)}
              </AppText>
            ))}
            <AppText variant="caption" muted>
              Quests that load it are paused. Tap a spot again to clear it.
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
