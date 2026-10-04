import { StyleSheet, View } from 'react-native';
import {
  explainPause,
  explainQuest,
  ageLabel,
  type Finger,
  type Side,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Column,
  Columns,
  Panel,
  Tag,
  WarningSign,
  spacing,
} from '@hackyeah/ui';
import { DecisionHelp } from '../components/DecisionHelp';
import { HandDiagram } from '../components/HandDiagram';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { fingerLabel, spotsText } from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useMedia } from '../media';
import { canStart, useInputReadiness } from '../readiness';
import { StateLabel } from '../components/StateLabel';
import { useGame } from '../state/GameProvider';
import { SavedMedia } from '../demo/SavedMedia';

// Symptom screen: quiet panels and plain words. No monkey, no rewards.

const SIDES: readonly Side[] = ['left', 'right'];

export function HandsScreen() {
  const { state, today, focus, quest, clearFinger } = useGame();
  const { navigate } = useNavigation<RouteName>();
  const flags = state.flags;
  const soreOn = (side: Side) =>
    flags.filter(f => f.side === side).map(f => f.finger);
  const open = (side: Side, finger: Finger) =>
    navigate('Finger', { side, finger });

  return (
    <TabScreen>
      <PageHeader
        title="Hands"
        subtitle="Mark a sore finger and finger-loading quests wait until you clear it. Optional, private and not a diagnosis."
      />

      <Panel variant="quiet" title="Choose a finger">
        <AppText>Palms face you. Tap the finger that hurts.</AppText>
        <View style={styles.hands}>
          {SIDES.map(side => (
            <HandDiagram
              key={side}
              side={side}
              sore={soreOn(side)}
              onOpen={finger => open(side, finger)}
            />
          ))}
        </View>
        <AppText variant="caption" muted>
          Flagged fingers are red with a !.
        </AppText>
      </Panel>
      <Columns>
        <Column>
          <Panel variant={flags.length > 0 ? 'alert' : 'quiet'} title="Flagged">
            <DecisionHelp
              label="Finger pause rule"
              explanation={explainPause(flags)}
            />
            {flags.length === 0 ? (
              <AppText>Nothing flagged. Quests run as normal.</AppText>
            ) : (
              <View style={styles.flags}>
                {flags.map(f => {
                  const label = fingerLabel(f.side, f.finger);
                  return (
                    <View key={`${f.side}-${f.finger}`} style={styles.flag}>
                      <AppText>
                        <AppText style={styles.strong}>{label}:</AppText>{' '}
                        {spotsText(f.finger, f.spots)}.
                      </AppText>
                      <AppText variant="caption" muted>
                        Flagged {ageLabel(f.date, today)}.
                      </AppText>
                      <View style={styles.actions}>
                        <Button
                          title="Edit"
                          variant="secondary"
                          small
                          accessibilityLabel={`Edit ${label.toLowerCase()}`}
                          onPress={() => open(f.side, f.finger)}
                        />
                        <Button
                          title="Clear"
                          variant="secondary"
                          small
                          accessibilityLabel={`Clear ${label.toLowerCase()}`}
                          onPress={() => clearFinger(f.side, f.finger)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Panel>

          {quest.paused.length > 0 ? (
            <Panel variant="quiet" title="Quests">
              <View style={styles.row}>
                <Tag text="Paused" tone="paused" />
                <AppText style={styles.grow}>
                  {quest.paused.map(q => q.title).join(', ')}
                </AppText>
              </View>
              <AppText variant="caption" muted>
                {quest.paused.length === 1
                  ? 'It loads your fingers, so it waits until nothing is flagged.'
                  : 'They load your fingers, so they wait until nothing is flagged.'}
              </AppText>
              {quest.quest ? (
                <View style={styles.offer}>
                  <DecisionHelp
                    label="Alternative quest"
                    title={quest.quest.title}
                    takeaway={quest.quest.why}
                    explanation={explainQuest(
                      quest.quest,
                      focus,
                      state.logs,
                      flags,
                      { completed: state.completed, skipped: state.skipped },
                    )}
                  >
                    <AppText>
                      Offered instead:{' '}
                      <AppText style={styles.strong}>
                        {quest.quest.title}
                      </AppText>
                    </AppText>
                  </DecisionHelp>
                  <AppText variant="caption" muted>
                    {quest.quest.task}
                  </AppText>
                </View>
              ) : (
                <AppText>Nothing else is on offer right now.</AppText>
              )}
            </Panel>
          ) : null}
        </Column>
        <Column>
          <PhotoPanel />
          <SavedMedia kind="hands" />
          <Panel variant="quiet">
            <View style={styles.note}>
              <WarningSign />
              <AppText variant="caption" style={styles.grow}>
                Your own note, not a diagnosis. The app cannot tell when a
                finger is ready for climbing. Sharp pain, a pop, swelling or pain
                that keeps going: stop climbing and see a physio or doctor.
              </AppText>
            </View>
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
  );
}

/**
 * The hand photo journal: a private photo with how it feels. A finger entry
 * flags or clears that finger like the close-up, so there is one set of
 * flags. It needs the server, which keeps the photos.
 */
function PhotoPanel() {
  const { navigate } = useNavigation<RouteName>();
  const media = useMedia();
  const state = useInputReadiness().handPhotos;
  return (
    <Panel variant="quiet" title="Hand photos" icon="camera">
      <View style={styles.row}>
        <AppText style={styles.grow}>
          A private photo of a sore spot, with how it feels today.
        </AppText>
        <StateLabel state={state} />
      </View>
      {media && canStart(state) ? (
        <Button
          title="Add a photo"
          variant="secondary"
          small
          style={styles.start}
          onPress={() => navigate('HandCapture')}
        />
      ) : (
        <AppText variant="caption" muted>
          {state === 'device'
            ? 'This device has no camera.'
            : 'The server keeps the photos, and this build is not connected to one. Marking fingers above still works.'}
        </AppText>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  hands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  flags: { gap: spacing.lg },
  flag: { gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
  offer: { gap: spacing.xs },
  strong: { fontWeight: '800' },
  start: { alignSelf: 'flex-start' },
});
