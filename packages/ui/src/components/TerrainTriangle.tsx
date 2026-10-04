import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { radialChart } from '../pixel/charts';
import { useTheme } from '../theme';
import { useTone } from '../tone';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PixelArt } from './PixelArt';
import { PixelText } from './PixelText';
import type { IconName } from '../pixel/sprites';

export type TerrainKey = 'slab' | 'vertical' | 'overhang';

export type TerrainStat = Readonly<{
  logged: number;
  sent: number;
  rate: number | null;
}>;

type Props = {
  stats: Readonly<Record<TerrainKey, TerrainStat>>;
  focus?: TerrainKey;
  onSelect?: (terrain: TerrainKey) => void;
};

/** One corner of a RateTriangle. */
export type TriangleCorner<K extends string> = Readonly<{
  key: K;
  name: string;
  icon: IconName;
}>;

/** A stat for a RateTriangle corner: `done` of `logged`, e.g. runs finished. */
export type TriangleStat = Readonly<{
  logged: number;
  done: number;
  rate: number | null;
}>;

const SCALE = 4;
const CHART_WIDTH = 61; // art pixels
// Clockwise from the top, matching the design sketch.
const ANGLES = [-90, 30, 150].map(d => (d * Math.PI) / 180);
const TERRAIN_CORNERS: readonly [
  TriangleCorner<TerrainKey>,
  TriangleCorner<TerrainKey>,
  TriangleCorner<TerrainKey>,
] = [
  { key: 'vertical', name: 'Vertical', icon: 'vertical' },
  { key: 'overhang', name: 'Overhang', icon: 'overhang' },
  { key: 'slab', name: 'Slab', icon: 'slab' },
];

/**
 * Terrain triangle: each corner grows on its own with the share of logged
 * climbs that were sent. Corners without enough logs stay dashed.
 */
export function TerrainTriangle({ stats, focus, onSelect }: Props) {
  const rated = useMemo(
    () =>
      Object.fromEntries(
        TERRAIN_CORNERS.map(({ key }) => [
          key,
          { logged: stats[key].logged, done: stats[key].sent, rate: stats[key].rate },
        ]),
      ) as Record<TerrainKey, TriangleStat>,
    [stats],
  );
  return (
    <RateTriangle
      corners={TERRAIN_CORNERS}
      stats={rated}
      verb="sent"
      unit="climbs"
      focus={focus}
      onSelect={onSelect}
    />
  );
}

/**
 * The triangle chart for any three things with a success rate: corners in
 * clockwise order from the top. The sport modes use it for their three kinds
 * (run types, strokes: "finished"), the monkey for walls ("sent").
 */
export function RateTriangle<K extends string>({
  corners,
  stats,
  verb,
  unit,
  focus,
  onSelect,
}: {
  corners: readonly [TriangleCorner<K>, TriangleCorner<K>, TriangleCorner<K>];
  stats: Readonly<Record<K, TriangleStat>>;
  /** Past tense for `done`: "sent", "finished". */
  verb: string;
  /** What a corner counts, for the button hint: "climbs", "runs". */
  unit: string;
  focus?: K;
  onSelect?: (key: K) => void;
}) {
  const theme = useTheme();
  const tone = useTone();
  const chart = useMemo(
    () =>
      radialChart({
        width: CHART_WIDTH,
        height: 52,
        cx: 30,
        cy: 34,
        radius: 28,
        angles: ANGLES,
        values: corners.map(c => stats[c.key].rate),
        focus: focus ? corners.findIndex(c => c.key === focus) : undefined,
      }),
    [corners, stats, focus],
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

  const label = (
    corner: TriangleCorner<K>,
    align: 'flex-start' | 'center' | 'flex-end',
  ) => (
    <Corner
      name={corner.name}
      icon={corner.icon}
      stat={stats[corner.key]}
      verb={verb}
      unit={unit}
      focused={focus === corner.key}
      align={align}
      onPress={onSelect ? () => onSelect(corner.key) : undefined}
    />
  );

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {label(corners[0], 'center')}
      <PixelArt rows={chart.rows} colors={colors} scale={SCALE} />
      {/* Keeps the bottom labels near their corners on wide panels. */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: CHART_WIDTH * SCALE + 120,
          maxWidth: '100%',
        }}
      >
        {label(corners[2], 'flex-start')}
        {label(corners[1], 'flex-end')}
      </View>
    </View>
  );
}

function Corner({
  name,
  icon,
  stat,
  verb,
  unit,
  focused,
  align,
  onPress,
}: {
  name: string;
  icon: IconName;
  stat: TriangleStat;
  verb: string;
  unit: string;
  focused: boolean;
  align: 'flex-start' | 'center' | 'flex-end';
  onPress?: () => void;
}) {
  const theme = useTheme();
  const tone = useTone();
  const summary =
    stat.rate === null
      ? `${stat.logged} logged, need 3`
      : `${stat.done} of ${stat.logged} ${verb}`;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${name}: ${summary}${focused ? '. Current focus' : ''}`}
      accessibilityHint={onPress ? `Shows the ${unit} behind this corner` : undefined}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        alignItems: align,
        opacity: pressed ? 0.6 : 1,
        minHeight: 44,
        justifyContent: 'center',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} />
        <View
          style={
            focused
              ? { backgroundColor: theme.colors.primary, paddingHorizontal: 4, paddingVertical: 3 }
              : { paddingVertical: 3 }
          }
        >
          <PixelText
            text={name}
            color={focused ? theme.colors.onPrimary : tone.text}
            accessible={false}
          />
        </View>
      </View>
      <AppText variant="caption" muted>
        {summary}
      </AppText>
    </Pressable>
  );
}
