import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AssessmentRecord } from '@hackyeah/core';
import {
  AppText,
  Button,
  Column,
  Columns,
  spacing,
  type Crumb,
} from '@hackyeah/ui';
import { HowToMeasure, LiveAssessment } from '../capture/LiveAssessment';
import { AssessmentCameraTray } from '../capture/AssessmentCameraTray';
import type { AssessmentCompletion } from '../capture/AssessmentReview';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { StateLabel } from '../components/StateLabel';
import { TabScreen } from '../components/TabScreen';
import { useDemo } from '../demo/DemoProvider';
import { useMedia } from '../media';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { trailFor } from '../navigation/trail';
import { usePrivacy } from '../privacy/PrivacyProvider';
import { useGame } from '../state/GameProvider';

export const NOT_VALIDATED =
  'A projected angle from the camera, not a validated flexibility test.';

/**
 * A live camera assessment: the Camera tray (box, status, Record or Stop)
 * and three steps on how to stand, then a review that holds the result
 * until it is saved. In review the page breadcrumb continues into the
 * review's own steps, so there is one trail, not two.
 */
export function AssessmentScreen() {
  const { route, params, navigate, backTo } = useNavigation<RouteName>();
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
  const trail = trailFor(route, params);
  const crumbs = useMemo<Crumb[]>(
    () =>
      trail.map((step, i) => ({
        label: step.label,
        short: step.short,
        onPress:
          i < trail.length - 1 ? () => backTo(trail.slice(0, i + 1)) : undefined,
      })),
    [trail, backTo],
  );
  const results = () =>
    navigate('MeasurementDetail', {
      metric,
      ...(params.detailMetric ? { detailMetric: params.detailMetric } : {}),
    });
  // A completion override exists only while reviewing.
  const reviewing = completion !== undefined;
  return (
    <TabScreen completion={completion}>
      <View style={styles.page}>
        {reviewing ? null : <Crumbs />}
        <PageHeader
          title={title}
          subtitle={
            metric === 'shoulder_reach'
              ? 'Raise your arms in front of the camera, hold, then review.'
              : 'Stand wide in front of the camera, hold, then review.'
          }
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
            crumbs={crumbs}
            next={[
              {
                title: 'See your results',
                accessibilityLabel: `See your ${title.toLowerCase()} results`,
                onPress: results,
              },
            ]}
          />
        ) : (
          <Columns>
            <Column>
              <AssessmentCameraTray
                unavailable="Connect the analysis service to record a live measurement."
                below={
                  <View style={styles.controls}>
                    <StateLabel state="server" />
                    <AppText>
                      Live analysis runs on the Climbing Monkey server, and
                      this build is not connected to one.
                    </AppText>
                    <Button
                      title="Record"
                      icon="camera"
                      disabled
                      onPress={() => {}}
                    />
                  </View>
                }
              />
            </Column>
            <Column>
              <HowToMeasure metric={metric} />
            </Column>
          </Columns>
        )}
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  controls: { gap: spacing.sm + 2 },
});
