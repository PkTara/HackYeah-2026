import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ANATOMY_LAYERS,
  FINGERS,
  anatomyById,
  anatomyIdForSpot,
  counterpartIn,
  type AnatomyLayer,
  type Finger,
  type Side,
} from '@hackyeah/core';
import { AppText, HandAnatomy, Panel, WarningSign, spacing } from '@hackyeah/ui';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';

// Learning screen: quiet panels and plain words. No monkey, no rewards.

type Start = Readonly<{ side: Side; layer: AnatomyLayer; id: string | null }>;

/**
 * Where the viewer starts. Params, all optional: side; layer; id (a part
 * id from core's anatomy); or finger and spot (a spot of the finger
 * close-up, such as 'a2'), which picks that part.
 */
export function anatomyStart(params: Readonly<Record<string, string>>): Start {
  const side: Side = params.side === 'left' ? 'left' : 'right';
  const finger = FINGERS.find(f => f === params.finger);
  const id =
    (params.id && anatomyById(params.id) ? params.id : undefined) ??
    (finger && params.spot ? anatomyIdForSpot(finger, params.spot) : undefined) ??
    null;
  const asked = ANATOMY_LAYERS.find(l => l === params.layer);
  const layer = asked ?? (id ? anatomyById(id)?.layer : undefined) ?? 'skeleton';
  return { side, layer, id: counterpartIn(layer, id) };
}

/**
 * The hand anatomy viewer on its own page. Reached from the finger
 * close-up ("What is each part"), or from a web link: /#Anatomy.
 */
export function AnatomyScreen() {
  const { params, backTo } = useNavigation<RouteName>();
  const [start] = useState(() => anatomyStart(params));
  const [side, setSide] = useState<Side>(start.side);
  const [selected, setSelected] = useState<string | null>(start.id);

  // Back to that finger's close-up: popped to it when it is open below.
  const openFinger = (finger: Finger) =>
    backTo([{ route: 'Hands' }, { route: 'Finger', params: { side, finger } }]);

  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Hand anatomy"
        subtitle="Slide between bones, muscles and tendons. Tap a part to read about it."
      />
      <HandAnatomy
        side={side}
        onSideChange={setSide}
        selected={selected}
        onSelect={setSelected}
        initialLayer={start.layer}
        onOpenFinger={openFinger}
        initialListOpen
      />
      <Panel variant="quiet">
        <View style={styles.note}>
          <WarningSign />
          <AppText variant="caption" style={styles.grow}>
            General anatomy for learning, not a diagnosis. If you feel sharp
            pain, hear a pop, or see swelling or bruising, stop climbing and
            see a physio or doctor.
          </AppText>
        </View>
      </Panel>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 4 },
  grow: { flex: 1 },
});
