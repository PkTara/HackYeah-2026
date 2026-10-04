import { StyleSheet, View } from 'react-native';
import { AppText, Button, PX, useTheme } from '@hackyeah/ui';

export function DataRow({
  title,
  subtitle,
  action = 'Open',
  accessibilityLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  action?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.surfaceShade }]}>
      <View style={styles.copy}>
        <AppText>{title}</AppText>
        <AppText variant="caption" muted>
          {subtitle}
        </AppText>
      </View>
      <Button
        title={action}
        variant="secondary"
        small
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: PX,
  },
  copy: { flex: 1, gap: 2 },
});
