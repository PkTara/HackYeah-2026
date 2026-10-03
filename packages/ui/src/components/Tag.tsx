import { View } from 'react-native';
import { PX, useTheme } from '../theme';
import { PixelText } from './PixelText';

type Props = {
  text: string;
  tone?: 'example' | 'paused' | 'new' | 'focus' | 'muted';
};

/** Small stamp for states: EXAMPLE data, PAUSED quests, the current focus. */
export function Tag({ text, tone = 'example' }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const colors = {
    example: { bg: c.info, fg: '#FFFFFF' },
    paused: { bg: c.danger, fg: c.onDanger },
    new: { bg: c.leaf, fg: '#FFFFFF' },
    focus: { bg: c.primary, fg: c.onPrimary },
    muted: { bg: c.surfaceShade, fg: c.text },
  }[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors.bg,
        borderWidth: PX - 1,
        borderColor: c.outline,
        paddingHorizontal: 6,
        paddingVertical: 4,
      }}
    >
      <PixelText text={text} color={colors.fg} />
    </View>
  );
}
