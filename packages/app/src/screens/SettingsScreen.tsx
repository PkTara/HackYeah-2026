import { AppText, Button, Panel } from '@hackyeah/ui';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { DemoButton } from '../demo/DemoControls';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useSetup } from '../onboarding/OnboardingGate';
import { PrivacyPanel } from '../privacy/PrivacyPanel';

export function SettingsScreen() {
  const { navigate, params } = useNavigation<RouteName>();
  const { redoSetup } = useSetup();
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Settings"
        subtitle="Permissions and presentation controls for this app."
      />
      <PrivacyPanel />
      <Panel title="App settings">
        <DemoButton parent="Settings" />
        <Button title="Redo setup" variant="secondary" onPress={redoSetup} />
        <Button
          title="About this build"
          variant="secondary"
          onPress={() =>
            navigate('About', {
              ...params,
              from: 'Settings',
              ...(params.from ? { settingsFrom: params.from } : {}),
            })
          }
        />
        <AppText variant="caption">
          Turning off a camera permission stops active uploads. Existing saved
          records are managed through your profile.
        </AppText>
      </Panel>
    </TabScreen>
  );
}
