import { Text, type TextProps } from 'react-native';
import { useTheme, type Theme } from '../theme';

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
  return (
    <Text
      style={[
        theme.typography[variant],
        { color: muted ? theme.colors.textMuted : theme.colors.text },
        style,
      ]}
      {...rest}
    />
  );
}
