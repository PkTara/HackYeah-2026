import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SPOT_LAYERS,
  ageLabel,
  spotsFor,
  type AnatomyLayer,
  type SpotLayer,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  CheckRow,
  Chip,
  Divider,
  FingerMap,
  Panel,
  WarningSign,
  spacing,
  useLayout,
} from '@hackyeah/ui';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { SPOT_LAYER_NAME, fingerLabel, spotsText } from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { anatomyParams, fingerParams } from '../navigation/trail';
import { useGame } from '../state/GameProvider';

// Symptom screen: quiet panels and plain words. No monkey, no rewards.

/** The anatomy viewer's layer for each layer of the close-up. */
const ANATOMY_LAYER: Readonly<Record<SpotLayer, AnatomyLayer>> = {
  segments: 'skeleton',
  pulleys: 'tendon',
  tendon: 'tendon',
};

/**
 * Close-up of one finger, opened from the Hands tab with
 * navigate('Finger', { side, finger }). Tap the spots that hurt. Every tap
 * is saved straight away, so Done only goes back.
 *
 * Everything that works together sits in one tray, split by dividers: the
 * layer, the finger and its spots, "not sure where" (the other way to
 * answer) and what is marked now.
 */
export function FingerScreen() {
  const { params, canGoBack, goBack, reset, navigate } =
    useNavigation<RouteName>();
  const { state, today, setFingerSpots, clearFinger } = useGame();
  // Wide windows have room for a bigger drawing and a one-line title.
  const wide = useLayout().rail;
  const { side, finger } = fingerParams(params);
  const flag = state.flags.find(f => f.side === side && f.finger === finger);
  const marked = flag?.spots ?? [];
  const spots = spotsFor(finger);
  // Open on the layer of the first marked spot, so the marks are in view.
  const [layer, setLayer] = useState<SpotLayer>(
    () => spots.find(s => marked.includes(s.id))?.layer ?? 'segments',
  );
  const shown = spots.filter(s => s.layer === layer);

  const label = fingerLabel(side, finger);
  // On a phone the whole name is too wide for one line of the big font.
  const title = wide ? label : label.replace(' finger', '\nfinger');
  const notSure = flag !== undefined && marked.length === 0;
  const status = flag
    ? `Flagged ${ageLabel(flag.date, today)}: ${spotsText(finger, marked)}.`
    : 'Not flagged. Quests run as normal.';

  // Opened from a web link there is nothing to go back to.
  const done = () => (canGoBack ? goBack() : reset('Hands'));
  const toggle = (id: string) =>
    setFingerSpots(
      side,
      finger,
      marked.includes(id) ? marked.filter(s => s !== id) : [...marked, id],
    );
  // The anatomy viewer opens on a spot of this layer, a marked one first.
  const learn = () =>
    navigate(
      'Anatomy',
      anatomyParams({
        side,
        finger,
        layer: ANATOMY_LAYER[layer],
        spot: (shown.find(s => marked.includes(s.id)) ?? shown[0])?.id,
      }),
    );

  const picker = (
    <View style={styles.part}>
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
      <Divider />
      <FingerMap
        thumb={finger === 'thumb'}
        layer={layer}
        spots={shown}
        marked={marked}
        onToggle={toggle}
        scale={wide ? 8 : 6}
      />
      <View style={styles.caption}>
        <AppText variant="caption" muted style={styles.grow}>
          Palm side, tip at the top.
        </AppText>
        <Button
          title="What is each part"
          variant="secondary"
          small
          accessibilityLabel="What is each part: open the hand anatomy"
          onPress={learn}
        />
      </View>
    </View>
  );

  const answer = (
    <View style={styles.part}>
      <CheckRow
        name="Sore, not sure where"
        detail="instead of picking spots"
        checked={notSure}
        onPress={() =>
          notSure ? clearFinger(side, finger) : setFingerSpots(side, finger, [])
        }
      />
      <Divider />
      <View style={styles.status}>
        <AppText>{status}</AppText>
        {flag ? (
          <>
            <AppText variant="caption" muted>
              Quests that load your fingers wait until you clear it.
            </AppText>
            <Button
              title="Clear this finger"
              variant="secondary"
              small
              onPress={() => clearFinger(side, finger)}
              style={styles.start}
            />
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title={title}
        subtitle="Tap where it hurts. Pick as many spots as you need."
      />

      <Panel variant="quiet">
        {wide ? (
          <View style={styles.split}>
            <View style={styles.grow}>{picker}</View>
            <Divider vertical />
            <View style={styles.grow}>{answer}</View>
          </View>
        ) : (
          <>
            {picker}
            <Divider />
            {answer}
          </>
        )}
      </Panel>

      <Outside wide={wide}>
        <View style={wide ? styles.done : null}>
          <Button title="Done" onPress={done} />
        </View>
        <Panel variant="quiet" style={styles.grow}>
          <View style={styles.note}>
            <WarningSign />
            <AppText variant="caption" style={styles.grow}>
              This marks where it hurts. It is not a diagnosis. If you heard a
              pop, see swelling or bruising, or it hurts to bend or straighten
              the finger, stop climbing and see a physio or doctor.
            </AppText>
          </View>
        </Panel>
      </Outside>
    </TabScreen>
  );
}

/** Done and the safety note: side by side on wide screens. */
function Outside({ wide, children }: { wide: boolean; children: ReactNode }) {
  return <View style={wide ? styles.outsideWide : styles.outside}>{children}</View>;
}

const styles = StyleSheet.create({
  part: { gap: spacing.md },
  split: { flexDirection: 'row', gap: spacing.lg },
  layers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Grow from their own width: equal widths would cut "Segments" on 360px.
  layer: { flexGrow: 1 },
  caption: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  status: { gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
  outside: { gap: spacing.lg },
  outsideWide: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  done: { width: 240 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
});
