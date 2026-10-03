import { Text, type TextProps } from 'react-native';
import { useTheme, type Theme } from '../theme';
import { useTone } from '../tone';

type Props = TextProps & {
  variant?: keyof Theme['typography'];
  muted?: boolean;
};

export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const tone = useTone();
  return (
    <Text
      style={[
        theme.typography[variant],
        { color: muted ? tone.textMuted : tone.text },
        style,
      ]}
      {...rest}
    />
  );
}
