import { AppText, Panel } from '@hackyeah/ui';
import { Crumbs } from '../components/Crumbs';
import { DataRow } from '../components/DataRow';
import { PageHeader } from '../components/PageHeader';
import { StateLabel } from '../components/StateLabel';
import { TabScreen } from '../components/TabScreen';
import { IntegrationsPanel } from '../demo/IntegrationsPanel';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { canStart, useInputReadiness } from '../readiness';
import { useGame } from '../state/GameProvider';

/**
 * The Activity row on Data (and on Profile when there is something to see).
 * Health-app imports are not built yet, so outside the demo the row only
 * says so and does not open.
 */
export function ActivitySummary({
  divider = true,
  hideUnavailable = false,
}: {
  divider?: boolean;
  /** Leave the row out entirely when it cannot be opened. */
  hideUnavailable?: boolean;
}) {
  const { navigate } = useNavigation<RouteName>();
  const state = useInputReadiness().activityImports;
  const usable = canStart(state);
  if (hideUnavailable && !usable) {
    return null;
  }
  return (
    <DataRow
      title="Activity and sleep"
      subtitle={
        usable
          ? 'Example workouts and sleep from health apps.'
          : 'Imports from health apps are not built yet.'
      }
      accessibilityLabel="Open activity and integrations"
      onPress={usable ? () => navigate('Activity') : undefined}
      state={state}
      divider={divider}
    />
  );
}

export function ActivityScreen() {
  const { state } = useGame();
  const { reset } = useNavigation<RouteName>();
  const imports = useInputReadiness().activityImports;
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Activity"
        subtitle="Workouts and sleep add context to your profile. They never change grades or scores."
      />
      <Panel title="Health apps">
        <StateLabel state={imports} />
        <AppText>
          {canStart(imports)
            ? 'Demo mode shows example imports below. They are labelled and stay in the demo profile.'
            : 'Importing from Apple Health, Health Connect, Garmin and Strava is not built yet.'}
        </AppText>
      </Panel>
      <IntegrationsPanel />
      <Panel title="Your own records" variant="quiet">
        <DataRow
          title="Climb log"
          subtitle={`${state.logs.length} climbs logged`}
          accessibilityLabel="Climbing log"
          onPress={() => reset('Log')}
        />
        <DataRow
          title="Hand check-in"
          subtitle={
            state.flags.length
              ? `${state.flags.length} flagged`
              : 'Nothing flagged'
          }
          accessibilityLabel="Hand journal"
          onPress={() => reset('Hands')}
          divider={false}
        />
      </Panel>
    </TabScreen>
  );
}
