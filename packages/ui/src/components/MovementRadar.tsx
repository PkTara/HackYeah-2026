import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radialChart } from '../pixel/charts';
import { useUiSound } from '../sound';
import { useTheme } from '../theme';
import { useTone } from '../tone';
import { AppText } from './AppText';
import { PixelArt } from './PixelArt';
import { PixelText } from './PixelText';

export type MovementAxis = Readonly<{
  label: string;
  /** 0 to 1, or null when the axis is not scored. Null is never drawn as zero. */
  value: number | null;
  /** Words under the name, such as "Building" or "Not enough data". */
  level?: string;
}>;

type Props = {
  /** Five axes, clockwise from the top. */
  axes: readonly MovementAxis[];
  /** Draws the shape striped to mark example values. */
  example?: boolean;
  /** Art pixel size. 3 fits a phone, 4 a wide column. */
  scale?: number;
  /** Makes each axis name a button, for example to explain that axis. */
  onSelect?: (index: number) => void;
};

const ART_W = 49;
const ART_H = 45;
const CX = 24;
const CY = 24;
const RADIUS = 20;
const ANGLES = [-90, -18, 54, 126, 198].map(d => (d * Math.PI) / 180);
/** Room for one axis label beside the chart, in px. */
const LABEL_W = 88;
/** Height of a name plus one or two lines of level words. */
const TOP_H = 40;
const BOTTOM_H = 56;

/**
 * Movement radar. Fixed axis order so shapes compare across sessions. A
 * scored axis has a point and joins the filled shape where its neighbour is
 * scored too; an axis without a value keeps a dashed spoke. With `level`
 * the words under each name say how far the axis got.
 */
export function MovementRadar({
  axes,
  example = false,
  scale = 3,
  onSelect,
}: Props) {
  const theme = useTheme();
  const tone = useTone();
  const chart = useMemo(
    () =>
      radialChart({
        width: ART_W,
        height: ART_H,
        cx: CX,
        cy: CY,
        radius: RADIUS,
        angles: ANGLES,
        values: axes.map(a => a.value),
        striped: example,
        partial: true,
      }),
    [axes, example],
  );
  const colors = useMemo(
    () => ({
      g: tone.text,
      d: tone.textMuted,
      h: theme.colors.danger,
      F: theme.colors.leafLight,
      S: theme.colors.leaf,
      E: theme.colors.chartEdge,
      Y: theme.colors.primary,
      O: theme.colors.outline,
    }),
    [tone, theme],
  );

  const chartW = ART_W * scale;
  const chartH = ART_H * scale;
  const width = chartW + 2 * LABEL_W;
  const tip = (i: number) => ({
    x: LABEL_W + chart.tips[i][0] * scale,
    y: TOP_H + chart.tips[i][1] * scale,
  });
  // Where each label sits: its box and how its words line up.
  const places = [
    { left: tip(0).x - LABEL_W / 2, top: 0, align: 'center' },
    { left: tip(1).x + 12, top: tip(1).y - 18, align: 'flex-start' },
    { left: tip(2).x - 8, top: tip(2).y + 10, align: 'flex-start' },
    { left: tip(3).x + 8 - LABEL_W, top: tip(3).y + 10, align: 'flex-end' },
    { left: tip(4).x - 12 - LABEL_W, top: tip(4).y - 18, align: 'flex-end' },
  ] as const;

  const spoken = `Movement radar${example ? ', example values' : ''}: ${axes
    .map(a => `${a.label} ${a.level ?? (a.value === null ? 'not scored' : '')}`.trim())
    .join(', ')}`;

  return (
    <View
      style={[styles.box, { width, height: TOP_H + chartH + BOTTOM_H }]}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={spoken}
        style={[styles.place, { left: LABEL_W, top: TOP_H }]}
      >
        <PixelArt rows={chart.rows} colors={colors} scale={scale} />
      </View>
      {axes.map((axis, i) => (
        <AxisLabel
          key={axis.label}
          axis={axis}
          align={places[i].align}
          style={[
            styles.place,
            { left: places[i].left, top: places[i].top, width: LABEL_W },
          ]}
          onPress={onSelect ? () => onSelect(i) : undefined}
        />
      ))}
    </View>
  );
}

function AxisLabel({
  axis,
  align,
  style,
  onPress,
}: {
  axis: MovementAxis;
  align: 'center' | 'flex-start' | 'flex-end';
  style: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const playSound = useUiSound();
  const scored = axis.value !== null;
  const textAlign =
    align === 'center' ? 'center' : align === 'flex-end' ? 'right' : 'left';
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${axis.label}: ${
        axis.level ?? (scored ? 'scored' : 'not scored')
      }`}
      accessibilityHint={onPress ? 'Shows how this axis is scored' : undefined}
      disabled={!onPress}
      onPress={() => {
        playSound('tap');
        onPress?.();
      }}
      hitSlop={4}
      style={({ pressed }) => [
        style,
        { alignItems: align, opacity: pressed ? 0.6 : 1, minHeight: 36 },
      ]}
    >
      <PixelText text={axis.label} accessible={false} />
      {axis.level ? (
        <AppText
          variant="caption"
          muted={!scored}
          style={{ textAlign }}
        >
          {axis.level}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { maxWidth: '100%', alignSelf: 'center' },
  place: { position: 'absolute' },
});
