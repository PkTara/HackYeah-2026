import { StyleSheet, View } from 'react-native';
import { AppText, Button, Panel } from '@hackyeah/ui';
import { measurementGroup } from '../components/measurementGroup';
import { AssessmentSummary } from '../components/AssessmentSummary';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { StateLabel } from '../components/StateLabel';
import { TabScreen } from '../components/TabScreen';
import { SavedMedia } from '../demo/SavedMedia';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { canStart, useInputReadiness, type Readiness } from '../readiness';
import { useGame } from '../state/GameProvider';

/** One line on what each measurement is and what it needs. */
const PURPOSE: Readonly<Record<string, string>> = {
  leg_spread:
    'How wide your legs open, estimated from the camera while you stand facing it.',
  shoulder_reach:
    'How far each arm raises overhead, estimated from the camera.',
  finger_force:
    'The force your fingers hold on an edge, read from a force gauge or load cell.',
};

/** What the state means for taking a new reading, in one plain line. */
function stateLine(state: Readiness): string {
  switch (state) {
    case 'server':
      return 'This build is not connected to the analysis server, so new camera readings are off. Saved results stay below.';
    case 'device':
      return 'This device has no camera. Saved results stay below.';
    case 'permission':
      return 'Turn on camera analysis in Settings first. The screen links there.';
    case 'demo':
      return 'Demo mode simulates the camera and the analysis.';
    default:
      return 'About a minute. Stand where the camera sees your whole body.';
  }
}

/**
 * One measurement: what it is, whether a new reading can be taken here, and
 * your saved results (the full history starts folded away).
 */
export function MeasurementDetailScreen() {
  const { params, navigate } = useNavigation<RouteName>();
  const group = measurementGroup(params.metric);
  const { state } = useGame();
  const readiness = useInputReadiness();
  const finger = group.metric === 'finger_force';
  const status: Readiness = finger ? 'ready' : readiness.cameraAssessment;
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader title={group.title} subtitle={PURPOSE[group.metric]} />
      <Panel
        title="New reading"
        icon={finger ? 'tests' : 'camera'}
        variant={canStart(status) ? 'sign' : 'quiet'}
      >
        <View style={styles.head}>
          <StateLabel state={status} />
        </View>
        <AppText>
          {finger
            ? 'Pull on the gauge for a few seconds, then type in the reading and how you set it up.'
            : stateLine(status)}
        </AppText>
        {canStart(status) ? (
          <Button
            title={
              finger ? 'Record finger strength' : `${group.title} assessment`
            }
            icon={finger ? undefined : 'camera'}
            onPress={() =>
              finger
                ? navigate('FingerStrength', { detailMetric: group.metric })
                : navigate('Assessment', {
                    metric: group.metric,
                    detailMetric: group.metric,
                  })
            }
          />
        ) : null}
        <AppText variant="caption" muted>
          {finger
            ? 'Compare readings taken with the same grip, edge and arm position.'
            : 'A projected camera angle, not a validated flexibility test.'}
        </AppText>
      </Panel>
      <AssessmentSummary
        records={state.assessments}
        metrics={group.metrics}
        title="Your results"
      />
      {group.metric === 'leg_spread' ? <SavedMedia kind="assessments" /> : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row' },
});
