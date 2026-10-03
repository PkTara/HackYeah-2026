import { AppText, Button, Card, Screen } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';

const layers = [
  ['@hackyeah/core', 'Domain logic in plain TypeScript'],
  ['@hackyeah/platform', 'Per-OS capability adapters'],
  ['@hackyeah/ui', 'Theme and shared components'],
  ['@hackyeah/app', 'Screens and navigation'],
] as const;

export function AboutScreen() {
  const { platform, platformLabel, haptics } = useCapabilities();
  const { goBack } = useNavigation<RouteName>();

  return (
    <Screen>
      <AppText variant="title">About</AppText>

      <Card>
        <AppText variant="heading">Platform</AppText>
        <AppText>Adapter: {platform}</AppText>
        <AppText>OS: {platformLabel}</AppText>
        <AppText>
          Haptics: {haptics.isAvailable ? 'available' : 'unavailable'}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">Architecture</AppText>
        {layers.map(([name, description]) => (
          <AppText key={name}>
            {name}
            <AppText muted> · {description}</AppText>
          </AppText>
        ))}
      </Card>

      <Button title="Back" variant="secondary" onPress={goBack} />
    </Screen>
  );
}
