import { AppText, Button, Panel } from '@hackyeah/ui';
import { Crumbs } from '../components/Crumbs';
import { DataRow } from '../components/DataRow';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { IntegrationsPanel } from '../demo/IntegrationsPanel';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

export function ActivitySummary() {
  const { state } = useGame();
  const { navigate } = useNavigation<RouteName>();
  return (
    <DataRow
      title="Activity & integrations"
      subtitle={`${state.logs.length} climbing observations recorded`}
      accessibilityLabel="Open activity and integrations"
      onPress={() => navigate('Activity')}
    />
  );
}
export function ActivityScreen() {
  const { state } = useGame();
  const { reset } = useNavigation<RouteName>();
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader title="Activity & integrations" />
      <Panel title="Activity & recovery">
        <AppText>
          {state.logs.length} climbing observations recorded. Activity and sleep
          add context to your profile.
        </AppText>
        <Button
          title="Climbing log"
          variant="secondary"
          small
          onPress={() => reset('Log')}
        />
        <Button
          title="Hand journal"
          variant="secondary"
          small
          onPress={() => reset('Hands')}
        />
        <AppText variant="caption" muted>
          Real health-provider imports are not available in this build. Demo
          controls provide labelled examples.
        </AppText>
      </Panel>
      <IntegrationsPanel />
    </TabScreen>
  );
}
