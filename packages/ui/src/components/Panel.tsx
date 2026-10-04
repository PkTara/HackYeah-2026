import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { IconName } from '../pixel/sprites';
import { PX, useTheme, type Theme } from '../theme';
import { ToneContext, type Tone } from '../tone';
import { Icon } from './Icon';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

export type PanelVariant = 'sign' | 'banana' | 'wood' | 'quiet' | 'alert';

type Props = {
  /** Shown on a little wooden tab sticking out of the top edge. */
  title?: string;
  icon?: IconName;
  /** Extra element at the right end of the title row, e.g. a Tag. */
  badge?: ReactNode;
  variant?: PanelVariant;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const TAB_OVERHANG = 14;

function look(theme: Theme, variant: PanelVariant) {
  const c = theme.colors;
  switch (variant) {
    case 'banana':
      return { fill: c.primary, light: '#FFE58A', shade: c.primaryShade, lift: PX * 2, tone: { text: c.onPrimary, textMuted: '#5C4513' } };
    case 'wood':
      return { fill: c.bark, light: c.barkLight, shade: c.barkDark, lift: PX * 2, tone: { text: '#FFF4DC', textMuted: '#E8CFA6' } };
    case 'quiet':
      return { fill: c.surface, light: undefined, shade: undefined, lift: 0, tone: { text: c.text, textMuted: c.textMuted } };
    case 'alert':
      return { fill: c.dangerSoft, light: undefined, shade: undefined, lift: PX, tone: { text: c.text, textMuted: c.textMuted } };
    default:
      return { fill: c.surface, light: c.surfaceLight, shade: c.surfaceShade, lift: PX * 2, tone: { text: c.text, textMuted: c.textMuted } };
  }
}

/** The main container: a hanging sign with an optional title tab. */
export function Panel({
  title,
  icon,
  badge,
  variant = 'sign',
  style,
  children,
}: Props) {
  const theme = useTheme();
  const l = look(theme, variant);
  const tone: Tone = l.tone;
  const tabWood = variant !== 'quiet';

  return (
    <View style={[{ marginTop: title ? TAB_OVERHANG : 0 }, style]}>
      <ToneContext.Provider value={tone}>
        <PixelBox
          fill={l.fill}
          outline={theme.colors.outline}
          light={l.light}
          shade={l.shade}
          shadow={theme.colors.backgroundDeep}
          lift={l.lift}
          contentStyle={{
            padding: theme.spacing.md,
            paddingTop: title ? theme.spacing.md + TAB_OVERHANG : theme.spacing.md,
            gap: theme.spacing.sm + 2,
          }}
        >
          {children}
        </PixelBox>
      </ToneContext.Provider>
      {title ? (
        <View
          style={{
            position: 'absolute',
            top: -TAB_OVERHANG,
            left: theme.spacing.sm + 4,
            right: theme.spacing.sm + 4,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            pointerEvents: 'box-none',
          }}
        >
          <PixelBox
            fill={tabWood ? theme.colors.bark : theme.colors.surfaceShade}
            outline={theme.colors.outline}
            light={tabWood ? '#8A5A33' : undefined}
            contentStyle={{
              paddingVertical: PX * 2 + 1,
              paddingHorizontal: PX * 3,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {icon ? <Icon name={icon} color={tabWood ? '#FFF4DC' : theme.colors.text} /> : null}
            <PixelText
              text={title}
              heading
              color={tabWood ? '#FFF4DC' : theme.colors.text}
            />
          </PixelBox>
          {badge ? <View style={{ marginTop: 4 }}>{badge}</View> : null}
        </View>
      ) : null}
    </View>
  );
}
