import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  FINGER_COLORS,
  FINGER_SLOT,
  FINGER_WIDTH,
  fingerParts,
  fingerRows,
  partSpan,
  type FingerLayer,
  type FingerPart,
} from '../pixel/finger';
import { PX, useTheme } from '../theme';
import { useTone } from '../tone';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PixelArt } from './PixelArt';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

export type { FingerLayer, FingerPart } from '../pixel/finger';

export type FingerMapSpot = Readonly<{
  id: string;
  name: string;
  detail: string;
  at: FingerPart;
  to?: FingerPart;
}>;

type Props = {
  /** A thumb is drawn with one segment fewer. */
  thumb: boolean;
  layer: FingerLayer;
  /** The spots of this layer. */
  spots: readonly FingerMapSpot[];
  /** Ids of the marked spots. */
  marked: readonly string[];
  onToggle: (id: string) => void;
  /**
   * Device pixels per art pixel. A part is FINGER_SLOT (8) art pixels tall,
   * so at least 6 keeps every row 48px or more.
   */
  scale?: number;
};

const GAP = 10;

/**
 * A big drawing of one finger with a row beside each spot of the layer on
 * show. Each row lines up with its spot on the drawing and the whole row,
 * the drawing beside it included, is the touch target.
 */
export function FingerMap({
  thumb,
  layer,
  spots,
  marked,
  onToggle,
  scale = 6,
}: Props) {
  const rows = fingerRows(
    thumb,
    layer,
    spots.map(s => ({ at: s.at, to: s.to, marked: marked.includes(s.id) })),
  );
  // Rows go from the tip down, so screen readers read them in that order.
  const ordered = [...spots].sort(
    (a, b) => partSpan(thumb, a.at).top - partSpan(thumb, b.at).top,
  );
  return (
    <View style={{ height: fingerParts(thumb).length * FINGER_SLOT * scale }}>
      <PixelArt
        rows={rows}
        colors={FINGER_COLORS}
        scale={scale}
        style={styles.drawing}
      />
      {ordered.map(spot => {
        const span = partSpan(thumb, spot.at, spot.to);
        return (
          <CheckRow
            key={spot.id}
            name={spot.name}
            detail={spot.detail}
            checked={marked.includes(spot.id)}
            onPress={() => onToggle(spot.id)}
            style={[
              styles.spot,
              {
                top: span.top * scale,
                height: span.height * scale,
                paddingLeft: FINGER_WIDTH * scale + GAP,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

type CheckRowProps = {
  /** Shown in the pixel font. */
  name: string;
  /** Plain words under the name. */
  detail?: string;
  checked: boolean;
  onPress: () => void;
  /**
   * warn (the default) fills a ticked box red, for marking something sore.
   * agree fills it banana yellow, for consent and confirmations.
   */
  tone?: 'warn' | 'agree';
  style?: StyleProp<ViewStyle>;
};

/** Pressable state; hovered is only reported on web and desktop. */
type PressState = { pressed: boolean; hovered?: boolean };

/**
 * A check box with a name and a line of detail. The whole row is one
 * target. Checked shows a tick, not only a colour, and screen readers hear
 * "checked".
 */
export function CheckRow({
  name,
  detail,
  checked,
  onPress,
  tone = 'warn',
  style,
}: CheckRowProps) {
  const c = useTheme().colors;
  // Ink colour for the box edge, so an empty box shows on dark panels too.
  const ink = useTone().text;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={detail ? `${name}, ${detail}` : name}
      aria-checked={checked}
      onPress={onPress}
      style={[styles.row, style]}
    >
      {(state: PressState) => (
        <View
          style={[
            styles.label,
            state.pressed
              ? { backgroundColor: c.surfaceShade }
              : state.hovered
              ? { backgroundColor: c.surfaceLight }
              : null,
          ]}
        >
          <PixelBox
            fill={
              checked
                ? tone === 'agree'
                  ? c.primary
                  : c.danger
                : c.surfaceLight
            }
            outline={ink}
            contentStyle={styles.box}
          >
            {checked ? (
              <Icon
                name="check"
                color={tone === 'agree' ? c.onPrimary : c.onDanger}
                style={styles.tick}
              />
            ) : null}
          </PixelBox>
          <View style={styles.text}>
            <PixelText text={name} accessible={false} />
            {detail ? (
              <AppText variant="caption" muted>
                {detail}
              </AppText>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  drawing: { position: 'absolute', left: 0, top: 0 },
  spot: { position: 'absolute', left: 0, right: 0 },
  row: { minHeight: 44, justifyContent: 'center' },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: PX,
    paddingRight: PX,
  },
  box: {
    width: 30,
    height: 30,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The tick sits high in its 12px icon; this centres it in the box.
  tick: { marginTop: 3 },
  text: { flexShrink: 1, gap: 2 },
});
