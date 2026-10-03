import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import {
  ANATOMY_GROUP_NAME,
  ANATOMY_LAYERS,
  ANATOMY_LAYER_INFO,
  anatomyById,
  anatomyGroups,
  anatomyIn,
  counterpartIn,
  type AnatomyGroup,
  type AnatomyLayer,
  type AnatomyStructure,
  type Finger,
  type Side,
} from '@hackyeah/core';
import {
  ANATOMY_COLORS,
  HAND_ANATOMY_HEIGHT,
  HAND_ANATOMY_WIDTH,
  handAnatomy,
  pickPart,
} from '../pixel/handAnatomy';
import { PX, spacing, useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { Divider } from './Divider';
import { LayerSlider } from './LayerSlider';
import { Panel } from './Panel';
import { PixelArt } from './PixelArt';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';
import { Tag } from './Tag';

type Props = {
  side: Side;
  /** Shows a Left / Right switch in the tray. */
  onSideChange?: (side: Side) => void;
  /** Id of the selected part (see @hackyeah/core anatomy), or null. */
  selected: string | null;
  onSelect: (id: string | null) => void;
  initialLayer?: AnatomyLayer;
  onLayerChange?: (layer: AnatomyLayer) => void;
  /** Adds a link to the finger close-up under a finger part. */
  onOpenFinger?: (finger: Finger) => void;
  /** Title on the tray's tab. */
  title?: string;
  /** Start with the list of parts open. */
  initialListOpen?: boolean;
};

const STOPS = ANATOMY_LAYERS.map(key => ({
  key,
  label: ANATOMY_LAYER_INFO[key].name,
}));
const SIDES: readonly Side[] = ['left', 'right'];
const SIDE_NAME: Readonly<Record<Side, string>> = { left: 'Left', right: 'Right' };
/** The light box behind the picture: the same in day and night. */
const LIGHTBOX = '#16231E';
/** From this tray width the explanation sits beside the hand. */
const WIDE = 640;

/** "right ring finger", "left thumb", "left hand". */
function whereWords(side: Side, part: AnatomyStructure): string {
  const finger = part.finger;
  if (!finger) {
    return `${SIDE_NAME[side]} hand`;
  }
  return `${SIDE_NAME[side]} ${finger === 'thumb' ? 'thumb' : `${finger} finger`}`;
}

/**
 * The hand anatomy viewer, all in one tray: a slider for the layer
 * (skeleton, muscle, tendon), a palm-view picture of the hand, and the
 * explanation of the part picked, split by dividers. Tap the picture to
 * pick the part under your finger; the list of parts does the same for
 * keyboards and screen readers. On wide trays the explanation sits beside
 * the hand.
 *
 * General anatomy for learning. It explains parts; it does not diagnose.
 */
export function HandAnatomy({
  side,
  onSideChange,
  selected,
  onSelect,
  initialLayer = 'skeleton',
  onLayerChange,
  onOpenFinger,
  title,
  initialListOpen = false,
}: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const window = useWindowDimensions();
  const [layer, setLayer] = useState<AnatomyLayer>(initialLayer);
  const [drag, setDrag] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const [listOpen, setListOpen] = useState(initialListOpen);

  const part = selected ? anatomyById(selected) : undefined;
  const shown = part && part.layer === layer ? part : undefined;

  // The list shows one group at a time; it follows the part picked.
  const [group, setGroup] = useState<AnatomyGroup>(part?.group ?? 'index');
  const [lastPicked, setLastPicked] = useState(selected);
  if (selected !== lastPicked) {
    setLastPicked(selected);
    if (part) {
      setGroup(part.group);
    }
  }
  const groups = anatomyGroups(layer);
  const listGroup = groups.includes(group) ? group : groups[0];

  const changeLayer = (next: AnatomyLayer) => {
    setLayer(next);
    onLayerChange?.(next);
    // Keep the same place in view: the proximal phalanx becomes its A2
    // pulley on the tendon layer.
    if (selected && anatomyById(selected)?.layer !== next) {
      onSelect(counterpartIn(next, selected));
    }
  };

  const wide = width >= WIDE;
  const pictureRoom = (wide ? (width - spacing.lg * 2) / 2 : width) - PX * 4;
  const scale = Math.max(
    3,
    Math.min(
      7,
      Math.floor(pictureRoom / HAND_ANATOMY_WIDTH),
      Math.floor((window.height * 0.6) / HAND_ANATOMY_HEIGHT),
    ),
  );

  const sideSwitch = onSideChange ? (
    <View style={styles.row}>
      {SIDES.map(s => (
        <View key={s} style={styles.grow}>
          <Chip
            label={`${SIDE_NAME[s]} hand`}
            selected={s === side}
            onPress={() => onSideChange(s)}
          />
        </View>
      ))}
    </View>
  ) : null;

  const slider = (
    <LayerSlider
      label="Layer"
      stops={STOPS}
      value={layer}
      onChange={changeLayer}
      onDrag={setDrag}
    />
  );

  const picture = (
    <View style={styles.pictureBlock}>
      <PixelBox
        fill={LIGHTBOX}
        outline={c.outline}
        style={styles.lightbox}
        contentStyle={styles.lightboxInside}
      >
        <Picture
          layer={layer}
          drag={drag}
          side={side}
          selected={selected}
          scale={scale}
          onPick={id => onSelect(id)}
        />
      </PixelBox>
      <AppText variant="caption" muted style={styles.center}>
        Palm side, fingers up. Tap a part to read about it.
      </AppText>
    </View>
  );

  const explanation = shown ? (
    <View style={styles.block} accessibilityLiveRegion="polite" aria-live="polite">
      <View style={styles.row}>
        <Tag text={ANATOMY_LAYER_INFO[shown.layer].name} tone="muted" />
        <AppText variant="caption" muted style={styles.grow}>
          {whereWords(side, shown)}
        </AppText>
      </View>
      <View>
        <AppText variant="heading" accessibilityRole="header">
          {shown.name}
        </AppText>
        <AppText variant="caption" muted>
          {shown.plain}
        </AppText>
      </View>
      <View style={styles.text}>
        <PixelText text="What it is" />
        <AppText>{shown.what}</AppText>
      </View>
      <View style={styles.text}>
        <PixelText text="Why climbers care" />
        <AppText>{shown.climbing}</AppText>
      </View>
      {onOpenFinger && shown.finger ? (
        <Button
          title="Finger close-up"
          variant="secondary"
          small
          accessibilityLabel={`Open the ${whereWords(side, shown).toLowerCase()} close-up`}
          onPress={() => shown.finger && onOpenFinger(shown.finger)}
          style={styles.start}
        />
      ) : null}
    </View>
  ) : (
    <View style={styles.block}>
      <PixelText text={ANATOMY_LAYER_INFO[layer].name} heading />
      <AppText>{ANATOMY_LAYER_INFO[layer].intro}</AppText>
      <AppText variant="caption" muted>
        Tap a part of the hand, or pick one from the list.
      </AppText>
    </View>
  );

  const list = (
    <View style={styles.block}>
      <Button
        title={listOpen ? 'Hide the list' : 'List of parts'}
        variant="secondary"
        small
        onPress={() => setListOpen(!listOpen)}
        style={styles.start}
      />
      {listOpen ? (
        <>
          <View style={styles.wrap}>
            {groups.map(g => (
              <Chip
                key={g}
                label={ANATOMY_GROUP_NAME[g]}
                selected={g === listGroup}
                onPress={() => setGroup(g)}
                accessibilityLabel={`${ANATOMY_GROUP_NAME[g]} parts`}
              />
            ))}
          </View>
          <View style={styles.wrap}>
            {anatomyIn(layer)
              .filter(s => s.group === listGroup)
              .map(s => (
                <PartButton
                  key={s.id}
                  part={s}
                  selected={s.id === selected}
                  onPress={() => onSelect(s.id === selected ? null : s.id)}
                />
              ))}
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <Panel variant="quiet" title={title}>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {wide ? (
          <View style={styles.columns}>
            <View style={[styles.grow, styles.block]}>
              {sideSwitch}
              {slider}
              <Divider />
              {picture}
            </View>
            <Divider vertical />
            <View style={[styles.grow, styles.block]}>
              {explanation}
              <Divider />
              {list}
            </View>
          </View>
        ) : (
          <View style={styles.block}>
            {sideSwitch}
            {slider}
            <Divider />
            {picture}
            <Divider />
            {explanation}
            <Divider />
            {list}
          </View>
        )}
      </View>
    </Panel>
  );
}

type PictureProps = {
  layer: AnatomyLayer;
  /** Slider position while dragging, else null. */
  drag: number | null;
  side: Side;
  selected: string | null;
  scale: number;
  onPick: (id: string) => void;
};

/**
 * The hand picture. While the slider is dragged it cross-fades between the
 * two layers on either side of the handle. A tap is turned into an art
 * pixel and looked up in the region grid.
 *
 * Screen readers skip it: the list of parts offers the same choices.
 */
function Picture({ layer, drag, side, selected, scale, onPick }: PictureProps) {
  const at = drag ?? ANATOMY_LAYERS.indexOf(layer);
  const below = ANATOMY_LAYERS[Math.floor(at)];
  const above = ANATOMY_LAYERS[Math.min(ANATOMY_LAYERS.length - 1, Math.ceil(at))];
  // Fade in quarter steps, which suits the pixel look.
  const fade = Math.round((at - Math.floor(at)) * 4) / 4;
  const base = useMemo(
    () => handAnatomy(below, side, counterpartIn(below, selected)),
    [below, side, selected],
  );
  const top = useMemo(
    () => handAnatomy(above, side, counterpartIn(above, selected)),
    [above, side, selected],
  );
  const width = HAND_ANATOMY_WIDTH * scale;
  const height = HAND_ANATOMY_HEIGHT * scale;

  const pick = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const id = pickPart(
      base.regions,
      Math.floor(locationX / scale),
      Math.floor(locationY / scale),
    );
    if (id) {
      onPick(id);
    }
  };

  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      onStartShouldSetResponder={() => true}
      onResponderRelease={pick}
      style={[styles.picture, { width, height }]}
    >
      <PixelArt rows={base.rows} colors={ANATOMY_COLORS} scale={scale} />
      {above !== below && fade > 0 ? (
        <PixelArt
          rows={top.rows}
          colors={ANATOMY_COLORS}
          scale={scale}
          style={[styles.overlay, { opacity: fade }]}
        />
      ) : null}
    </View>
  );
}

/** Pressable state; hovered and focused are only reported on the web. */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/** One part in the list: a key that stays down while it is picked. */
function PartButton({
  part,
  selected,
  onPress,
}: {
  part: AnatomyStructure;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useTheme().colors;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={part.finger ? `${part.name}, ${part.finger === 'thumb' ? 'thumb' : `${part.finger} finger`}` : part.name}
      aria-selected={selected}
      onPress={onPress}
      hitSlop={3}
    >
      {(state: PressState) => (
        <PixelBox
          fill={selected ? c.primary : state.hovered ? c.surfaceLight : c.surface}
          outline={state.focused ? c.info : c.outline}
          light={selected ? undefined : c.surfaceLight}
          shade={selected ? undefined : c.surfaceShade}
          shadow={c.backgroundDeep}
          lift={state.pressed || selected ? 0 : PX}
          style={{ marginTop: state.pressed || selected ? PX : 0 }}
          contentStyle={styles.partInside}
        >
          <AppText style={[styles.partText, { color: selected ? c.onPrimary : c.text }]}>
            {part.name}
          </AppText>
        </PixelBox>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  columns: { flexDirection: 'row', gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  text: { gap: spacing.xs },
  start: { alignSelf: 'flex-start' },
  center: { textAlign: 'center' },
  pictureBlock: { alignItems: 'center', gap: spacing.sm },
  lightbox: { alignSelf: 'center' },
  lightboxInside: { padding: PX * 2 },
  picture: { cursor: 'pointer' },
  overlay: { position: 'absolute', left: 0, top: 0 },
  partInside: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  partText: { fontWeight: '700' },
});
