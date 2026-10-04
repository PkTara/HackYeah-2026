import { AppText, Button, Panel, Toggle } from '@hackyeah/ui';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { DemoButton } from '../demo/DemoControls';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useSetup } from '../onboarding/OnboardingGate';
import { PrivacyPanel } from '../privacy/PrivacyPanel';
import { useSfx } from '../sfx';

export function SettingsScreen() {
  const { navigate, params } = useNavigation<RouteName>();
  const { redoSetup } = useSetup();
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Settings"
        subtitle="Permissions, sound and presentation controls for this app."
      />
      <PrivacyPanel />
      <SoundPanel />
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
      </Panel>
    </TabScreen>
  );
}

/** The sound effects switch. The music keeps its own key in the corner. */
function SoundPanel() {
  const { available, on, setOn } = useSfx();
  return (
    <Panel title="Sound">
      {available ? (
        <Toggle
          name="Sound effects"
          detail="Quiet clicks, typing and a chime when you save. The music has its own key in the corner."
          value={on}
          onValueChange={setOn}
        />
      ) : (
        <AppText>Sound effects are not available on this device yet.</AppText>
      )}
      <AppText variant="caption" muted>
        Sound effects made with ZzFX by Frank Force (MIT).
      </AppText>
    </Panel>
  );
}
