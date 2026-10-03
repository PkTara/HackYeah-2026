import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { radialChart } from '../pixel/charts';
import { useTheme } from '../theme';
import { useTone } from '../tone';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PixelArt } from './PixelArt';
import { PixelText } from './PixelText';

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

const SCALE = 4;
const CHART_WIDTH = 61; // art pixels
// Clockwise from the top, matching the design sketch.
const AXES: readonly TerrainKey[] = ['vertical', 'overhang', 'slab'];
const ANGLES = [-90, 30, 150].map(d => (d * Math.PI) / 180);
const NAMES: Record<TerrainKey, string> = {
  slab: 'Slab',
  vertical: 'Vertical',
  overhang: 'Overhang',
};

/**
 * Terrain triangle: each corner grows on its own with the share of logged
 * climbs that were sent. Corners without enough logs stay dashed.
 */
export function TerrainTriangle({ stats, focus, onSelect }: Props) {
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
        values: AXES.map(t => stats[t].rate),
        focus: focus ? AXES.indexOf(focus) : undefined,
      }),
    [stats, focus],
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

  const label = (t: TerrainKey, align: 'flex-start' | 'center' | 'flex-end') => (
    <Corner
      terrain={t}
      stat={stats[t]}
      focused={focus === t}
      align={align}
      onPress={onSelect ? () => onSelect(t) : undefined}
    />
  );

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {label('vertical', 'center')}
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
        {label('slab', 'flex-start')}
        {label('overhang', 'flex-end')}
      </View>
    </View>
  );
}

function Corner({
  terrain,
  stat,
  focused,
  align,
  onPress,
}: {
  terrain: TerrainKey;
  stat: TerrainStat;
  focused: boolean;
  align: 'flex-start' | 'center' | 'flex-end';
  onPress?: () => void;
}) {
  const theme = useTheme();
  const tone = useTone();
  const summary =
    stat.rate === null
      ? `${stat.logged} logged, need 3`
      : `${stat.sent} of ${stat.logged} sent`;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${NAMES[terrain]}: ${summary}${focused ? '. Current focus' : ''}`}
      accessibilityHint={onPress ? 'Shows the climbs behind this corner' : undefined}
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
        <Icon name={terrain} />
        <View
          style={
            focused
              ? { backgroundColor: theme.colors.primary, paddingHorizontal: 4, paddingVertical: 3 }
              : { paddingVertical: 3 }
          }
        >
          <PixelText
            text={NAMES[terrain]}
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
