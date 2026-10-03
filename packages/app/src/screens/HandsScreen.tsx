import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FINGERS, ageLabel, type Finger, type Side } from '@hackyeah/core';
import {
  AppText,
  Button,
  Chip,
  Column,
  Columns,
  HAND_HEIGHT,
  HandAnatomy,
  HAND_WIDTH,
  LEFT_HAND_FINGERS,
  Panel,
  PixelArt,
  PixelText,
  SPRITE_COLORS,
  Tag,
  WarningSign,
  handRows,
  spacing,
  useContentWidth,
  useLayout,
} from '@hackyeah/ui';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { FINGER_NAME, SIDE_NAME, fingerLabel, spotsText } from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useMedia } from '../media';
import { useGame } from '../state/GameProvider';

// Symptom screen: quiet panels and plain words. No monkey, no rewards.

const SIDES: readonly Side[] = ['left', 'right'];

/**
 * Touch area over one finger of the picture, in device pixels. The regions
 * are drawn on the left hand, so the right hand mirrors x. Each area grows
 * 1 art pixel up and down and half a pixel sideways, so neighbours meet on
 * the outline between two fingers instead of overlapping.
 */
function fingerArea(side: Side, finger: Finger, scale: number) {
  const r = LEFT_HAND_FINGERS[finger];
  const x0 = side === 'left' ? r.x0 : HAND_WIDTH - 1 - r.x1;
  const x1 = side === 'left' ? r.x1 : HAND_WIDTH - 1 - r.x0;
  const left = Math.max(0, x0 - 0.5);
  const right = Math.min(HAND_WIDTH, x1 + 1.5);
  const top = Math.max(0, r.y0 - 1);
  const bottom = Math.min(HAND_HEIGHT, r.y1 + 2);
  return {
    left: left * scale,
    top: top * scale,
    width: (right - left) * scale,
    height: (bottom - top) * scale,
  };
}

export function HandsScreen() {
  const { state, today, quest, clearFinger } = useGame();
  const { navigate } = useNavigation<RouteName>();
  // Two hands at scale 6 take 256px of a 296px panel on a 360px screen.
  // Smaller screens get scale 5 so the hands keep some room.
  const scale = useContentWidth() < 360 ? 5 : 6;
  const flags = state.flags;
  const soreOn = (side: Side) =>
    flags.filter(f => f.side === side).map(f => f.finger);
  const open = (side: Side, finger: Finger) =>
    navigate('Finger', { side, finger });
  // The anatomy tray: which hand, and the part picked on it. Phones show it
  // under the hands; wide screens give it the full width below both
  // columns, so the explanation can sit beside the hand.
  const wide = useLayout().columns === 2;
  const [anatomySide, setAnatomySide] = useState<Side>('right');
  const [part, setPart] = useState<string | null>(null);
  const anatomy = (
    <HandAnatomy
      title="Hand anatomy"
      side={anatomySide}
      onSideChange={setAnatomySide}
      selected={part}
      onSelect={setPart}
      onOpenFinger={finger => open(anatomySide, finger)}
      note="General anatomy for learning, not a diagnosis."
    />
  );

  return (
    <TabScreen>
      <PageHeader
        title="Hands"
        subtitle="Mark where a finger hurts. Quests that load your fingers wait until you clear it."
      />

      <Columns>
        <Column>
          <Panel variant="quiet">
            <View style={styles.hands}>
              {SIDES.map(side => (
                <Hand
                  key={side}
                  side={side}
                  sore={soreOn(side)}
                  scale={scale}
                  onOpen={finger => open(side, finger)}
                />
              ))}
            </View>
            <AppText variant="caption" muted>
              Palms up. Tap a finger or its name to mark where it hurts.
            </AppText>
          </Panel>
          {wide ? null : anatomy}
        </Column>

        <Column>
          <Panel variant={flags.length > 0 ? 'alert' : 'quiet'} title="Flagged">
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

          <PhotoPanel />

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
                  <AppText>
                    Offered instead:{' '}
                    <AppText style={styles.strong}>{quest.quest.title}</AppText>
                  </AppText>
                  <AppText variant="caption" muted>
                    {quest.quest.task}
                  </AppText>
                </View>
              ) : (
                <AppText>Nothing else is on offer right now.</AppText>
              )}
            </Panel>
          ) : null}

          <Panel variant="quiet">
            <View style={styles.note}>
              <WarningSign />
              <AppText variant="caption" style={styles.grow}>
                This is your own note, not a diagnosis. The app cannot tell when
                a finger is ready for climbing. If the pain is sharp, you felt a
                pop, there is swelling, or it keeps hurting, stop climbing and
                see a physio or doctor.
              </AppText>
            </View>
          </Panel>
        </Column>
      </Columns>
      {wide ? anatomy : null}
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
  return (
    <Panel variant="quiet" title="Hand photos">
      <AppText>
        Add a photo of a sore spot to your private journal, with how it feels
        today.
      </AppText>
      {media ? (
        <Button
          title="Add a photo"
          variant="secondary"
          small
          style={styles.start}
          onPress={() => navigate('HandCapture')}
        />
      ) : (
        <AppText variant="caption" muted>
          This needs the Climbing Monkey server, which keeps the photos. This
          build keeps everything on this device. Start the server with npm run
          backend:start and open the app with VITE_MONKEY_API_URL set
          (API_BASE_URL on a phone).
        </AppText>
      )}
    </Panel>
  );
}

type HandProps = Readonly<{
  side: Side;
  sore: readonly Finger[];
  scale: number;
  onOpen: (finger: Finger) => void;
}>;

/**
 * One hand: its name, the picture with tappable fingers, then one chip per
 * finger. Both open the finger close-up. The chips are the main control;
 * finger areas on the picture are small, so they are a touch shortcut and
 * hidden from screen readers (the chips already announce every finger).
 */
function Hand({ side, sore, scale, onOpen }: HandProps) {
  return (
    <View style={styles.hand}>
      <PixelText text={SIDE_NAME[side]} heading />
      <View aria-hidden importantForAccessibility="no-hide-descendants">
        <PixelArt
          rows={handRows(side, sore)}
          colors={SPRITE_COLORS}
          scale={scale}
        />
        {FINGERS.map(finger => (
          <Pressable
            key={finger}
            accessible={false}
            onPress={() => onOpen(finger)}
            style={[styles.area, fingerArea(side, finger, scale)]}
          />
        ))}
      </View>
      <View style={styles.chips}>
        {FINGERS.map(finger => (
          <Chip
            key={finger}
            label={FINGER_NAME[finger]}
            selected={sore.includes(finger)}
            warn
            onPress={() => onOpen(finger)}
            accessibilityLabel={fingerLabel(side, finger)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hands: { flexDirection: 'row', gap: spacing.md },
  hand: { flex: 1, alignItems: 'center', gap: spacing.sm },
  area: { position: 'absolute' },
  chips: { alignSelf: 'stretch', gap: spacing.sm },
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
