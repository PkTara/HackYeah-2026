import { useCallback, useState } from 'react';
import type { AssessmentRecord } from '@hackyeah/core';
import { AppText, Button, Panel } from '@hackyeah/ui';
import { LiveAssessment } from '../capture/LiveAssessment';
import { AssessmentCameraTray } from '../capture/AssessmentCameraTray';
import type { AssessmentCompletion } from '../capture/AssessmentReview';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { useDemo } from '../demo/DemoProvider';
import { useMedia } from '../media';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { usePrivacy } from '../privacy/PrivacyProvider';
import { useGame } from '../state/GameProvider';

export const NOT_VALIDATED =
  'A projected angle from the camera, not a validated flexibility test.';

export function AssessmentScreen() {
  const { params, navigate } = useNavigation<RouteName>();
  const metric =
    params.metric === 'shoulder_reach' ? 'shoulder_reach' : 'leg_spread';
  const title = metric === 'shoulder_reach' ? 'Shoulder reach' : 'Leg spread';
  const media = useMedia();
  const privacy = usePrivacy();
  const demo = useDemo();
  const { saveAssessment } = useGame();
  const [completion, setCompletion] = useState<AssessmentCompletion>();
  const save = useCallback(
    async (records: readonly AssessmentRecord[]) => {
      for (const record of records) {
        await saveAssessment(record);
      }
    },
    [saveAssessment],
  );
  return (
    <TabScreen {...{ completion }}>
      <Crumbs />
      <PageHeader
        title={title}
        subtitle="Hold steady, then review your camera measurement."
      />
      {media ? (
        <LiveAssessment
          media={media}
          metric={metric}
          consent={privacy.choices.cameraAnalysis}
          simulated={demo.settings.enabled && demo.settings.analysis}
          onSettings={() =>
            navigate('Settings', {
              from: 'Assessment',
              metric,
              ...(params.detailMetric
                ? { detailMetric: params.detailMetric }
                : {}),
            })
          }
          onSave={save}
          onCompletionChange={setCompletion}
        />
      ) : (
        <>
          <AssessmentCameraTray unavailable="Connect the analysis service to record a live measurement." />
          <Panel title="Recording" variant="quiet">
            <AppText>Live analysis is unavailable in this build.</AppText>
            <Button title="Record" disabled onPress={() => {}} />
          </Panel>
        </>
      )}
    </TabScreen>
  );
}
