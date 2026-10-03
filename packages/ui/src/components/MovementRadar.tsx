import { useMemo } from 'react';
import { View } from 'react-native';
import { radialChart } from '../pixel/charts';
import { useTheme } from '../theme';
import { useTone } from '../tone';
import { PixelArt } from './PixelArt';
import { PixelText } from './PixelText';

export type MovementAxis = Readonly<{ label: string; value: number | null }>;

type Props = {
  /** Five axes, clockwise from the top. */
  axes: readonly MovementAxis[];
  /** Draws the shape striped to mark example values. */
  example?: boolean;
};

const SCALE = 3;
const ANGLES = [-90, -18, 54, 126, 198].map(d => (d * Math.PI) / 180);

/** Movement radar. Fixed axis order so shapes compare across sessions. */
export function MovementRadar({ axes, example = false }: Props) {
  const theme = useTheme();
  const tone = useTone();
  const chart = useMemo(
    () =>
      radialChart({
        width: 49,
        height: 45,
        cx: 24,
        cy: 24,
        radius: 20,
        angles: ANGLES,
        values: axes.map(a => a.value),
        striped: example,
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
  const name = (i: number) => (
    <PixelText text={axes[i].label} accessible={false} />
  );

  return (
    <View
      accessible
      accessibilityLabel={`Movement radar${example ? ', example values' : ''}: ${axes
        .map(a => `${a.label} ${a.value === null ? 'not assessed' : `${Math.round(a.value * 10)} of 10`}`)
        .join(', ')}`}
      style={{ alignItems: 'center', gap: 6 }}
    >
      {name(0)}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <View style={{ marginTop: 44 }}>
          {name(4)}
        </View>
        <PixelArt rows={chart.rows} colors={colors} scale={SCALE} />
        <View style={{ marginTop: 44 }}>
          {name(1)}
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 28,
          marginTop: -4,
        }}
      >
        {name(3)}
        {name(2)}
      </View>
    </View>
  );
}
