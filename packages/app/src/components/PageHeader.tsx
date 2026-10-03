import { View } from 'react-native';
import { AppText, PixelText, useTheme } from '@hackyeah/ui';

type Props = {
  title: string;
  /** One plain sentence under the title. */
  subtitle?: string;
};

/** Big pixel title on the canopy background, for screens without the hero. */
export function PageHeader({ title, subtitle }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <PixelText
        text={title}
        heading
        scale={4}
        color={theme.colors.onBackground}
        shadow={theme.colors.backgroundDeep}
      />
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}
