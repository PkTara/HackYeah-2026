import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  FINGERS,
  SPOT_LAYERS,
  ageLabel,
  spotsFor,
  type Finger,
  type Side,
  type SpotLayer,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  CheckRow,
  Chip,
  Column,
  Columns,
  FingerMap,
  Panel,
  WarningSign,
  spacing,
  useLayout,
} from '@hackyeah/ui';
import { BackButton } from '../components/BackButton';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { SPOT_LAYER_NAME, fingerLabel, spotsText } from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

// Symptom screen: quiet panels and plain words. No monkey, no rewards.

/**
 * Close-up of one finger, opened from the Hands tab with
 * navigate('Finger', { side, finger }). Tap the spots that hurt. Every tap
 * is saved straight away, so Done only goes back.
 */
export function FingerScreen() {
  const { params, goBack } = useNavigation<RouteName>();
  const { state, today, setFingerSpots, clearFinger } = useGame();
  const wide = useLayout().rail;
  const side: Side = params.side === 'left' ? 'left' : 'right';
  const finger: Finger = FINGERS.find(f => f === params.finger) ?? 'index';
  const flag = state.flags.find(f => f.side === side && f.finger === finger);
  const marked = flag?.spots ?? [];
  const spots = spotsFor(finger);
  // Open on the layer of the first marked spot, so the marks are in view.
  const [layer, setLayer] = useState<SpotLayer>(
    () => spots.find(s => marked.includes(s.id))?.layer ?? 'segments',
  );

  const label = fingerLabel(side, finger);
  // On a phone the whole name is too wide for one line of the big font.
  const title = wide ? label : label.replace(' finger', '\nfinger');
  const notSure = flag !== undefined && marked.length === 0;

  const toggle = (id: string) =>
    setFingerSpots(
      side,
      finger,
      marked.includes(id) ? marked.filter(s => s !== id) : [...marked, id],
    );

  return (
    <TabScreen>
      <BackButton />
      <PageHeader
        title={title}
        subtitle="Tap where it hurts. Pick as many spots as you need."
      />

      <Columns>
        <Column>
          <View style={styles.layers}>
            {SPOT_LAYERS.map(l => (
              <View key={l} style={styles.layer}>
                <Chip
                  label={SPOT_LAYER_NAME[l]}
                  selected={l === layer}
                  onPress={() => setLayer(l)}
                />
              </View>
            ))}
          </View>

          <Panel variant="quiet">
            <FingerMap
              thumb={finger === 'thumb'}
              layer={layer}
              spots={spots.filter(s => s.layer === layer)}
              marked={marked}
              onToggle={toggle}
            />
            <AppText variant="caption" muted>
              Palm side, tip at the top.
            </AppText>
          </Panel>
        </Column>

        <Column>
          <Panel variant="quiet">
            <AppText>
              {flag
                ? `Flagged ${ageLabel(flag.date, today)}: ${spotsText(finger, marked)}.`
                : 'Not flagged. Quests run as normal.'}
            </AppText>
            {flag ? (
              <AppText variant="caption" muted>
                Quests that load your fingers wait until you clear it.
              </AppText>
            ) : null}
            <CheckRow
              name="Sore, not sure where"
              detail="Flags the finger with no spot marked."
              checked={notSure}
              onPress={() =>
                notSure
                  ? clearFinger(side, finger)
                  : setFingerSpots(side, finger, [])
              }
            />
            <Button title="Done" onPress={goBack} />
            {flag ? (
              <Button
                title="Clear this finger"
                variant="secondary"
                onPress={() => clearFinger(side, finger)}
              />
            ) : null}
          </Panel>

          <Panel variant="quiet">
            <View style={styles.note}>
              <WarningSign />
              <AppText variant="caption" style={styles.grow}>
                This marks where it hurts. It is not a diagnosis. If you heard
                a pop, see swelling or bruising, or it hurts to bend or
                straighten the finger, stop climbing and see a physio or
                doctor.
              </AppText>
            </View>
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  layers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Grow from their own width: equal widths would cut "Segments" on 360px.
  layer: { flexGrow: 1 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
});
