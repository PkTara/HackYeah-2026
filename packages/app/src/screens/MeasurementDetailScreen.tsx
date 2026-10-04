import { measurementGroup } from '../components/measurementGroup';
import { AppText, Button, Panel } from '@hackyeah/ui';
import { AssessmentSummary } from '../components/AssessmentSummary';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { SavedMedia } from '../demo/SavedMedia';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

export function MeasurementDetailScreen() {
  const { params, navigate } = useNavigation<RouteName>();
  const group = measurementGroup(params.metric);
  const { state } = useGame();
  const finger = group.metric === 'finger_force';
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader title={group.title} />
      <Panel variant="quiet">
        <AppText>
          {finger
            ? 'Record a reading from an external instrument under matching conditions.'
            : 'Camera angles are projected estimates, not a validated flexibility test.'}
        </AppText>
        <Button
          title={
            finger ? 'Record finger strength' : `${group.title} assessment`
          }
          variant="secondary"
          small
          onPress={() =>
            finger
              ? navigate('FingerStrength')
              : navigate('Assessment', { metric: group.metric })
          }
        />
      </Panel>
      <AssessmentSummary
        records={state.assessments}
        metrics={group.metrics}
        title="Measurements & history"
      />
      {group.metric === 'leg_spread' ? <SavedMedia kind="assessments" /> : null}
    </TabScreen>
  );
}
