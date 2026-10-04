import { useCallback } from 'react';
import type { AssessmentRecord } from '@hackyeah/core';
import { LiveAssessment } from '../capture/LiveAssessment';
import { NeedsServer } from '../capture/parts';
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
  const save = useCallback(
    async (records: readonly AssessmentRecord[]) => {
      for (const record of records) {
        await saveAssessment(record);
      }
    },
    [saveAssessment],
  );
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title={title}
        subtitle="Record a live measurement. Hold steady, then review your result."
      />
      {media ? (
        <LiveAssessment
          media={media}
          metric={metric}
          consent={privacy.choices.cameraAnalysis}
          simulated={demo.settings.enabled && demo.settings.analysis}
          onSettings={() =>
            navigate('Settings', { from: 'Assessment', metric })
          }
          onSave={save}
        />
      ) : (
        <NeedsServer what="The camera assessment" />
      )}
    </TabScreen>
  );
}
