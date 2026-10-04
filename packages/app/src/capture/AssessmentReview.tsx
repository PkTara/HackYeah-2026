import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { PoseResultDto } from '@hackyeah/data';
import {
  AppText,
  Breadcrumbs,
  Button,
  Panel,
  Tag,
  spacing,
} from '@hackyeah/ui';
import type { LiveMetric, Stability } from './stability';

export type AssessmentCompletion = {
  onPress: () => void;
  disabled: boolean;
};

export function measurementText(result: PoseResultDto, metric: LiveMetric) {
  return metric === 'shoulder_reach'
    ? `Left ${Math.round(result.left_value!)}° · Right ${Math.round(
        result.right_value!,
      )}°`
    : `${Math.round(result.value!)}°`;
}

/** Review navigation lives here; the owner retains the capture and save state. */
export function AssessmentReview({
  result,
  metric,
  phase,
  simulated,
  server,
  saving,
  saved,
  error,
  retryDisabled,
  onReset,
  onRetry,
  onSave,
  onCompletionChange,
  camera,
}: {
  result: PoseResultDto;
  metric: LiveMetric;
  phase: Stability['phase'];
  simulated: boolean;
  server: string;
  saving: boolean;
  saved: boolean;
  error: string;
  retryDisabled: boolean;
  onReset: () => void;
  onRetry: () => void;
  onSave: () => void;
  onCompletionChange?: (completion: AssessmentCompletion | undefined) => void;
  camera: ReactNode;
}) {
  const [details, setDetails] = useState<'measurement' | 'capture' | null>(
    null,
  );
  const incompleteRaise =
    metric === 'shoulder_reach' && ['baseline', 'raise'].includes(phase);
  const complete = useCallback(() => {
    if (details) {
      setDetails(null);
    } else {
      onReset();
    }
  }, [details, onReset]);
  useEffect(() => {
    onCompletionChange?.({ onPress: complete, disabled: !details && saving });
  }, [complete, details, saving, onCompletionChange]);
  return (
    <View style={{ gap: spacing.md }}>
      <Breadcrumbs
        crumbs={[
          {
            label:
              metric === 'shoulder_reach' ? 'Shoulder reach' : 'Leg spread',
            onPress: onReset,
          },
          {
            label: 'Review',
            ...(details ? { onPress: () => setDetails(null) } : {}),
          },
          ...(details
            ? [
                {
                  label:
                    details === 'measurement'
                      ? 'Measurement details'
                      : 'Capture details',
                },
              ]
            : []),
        ]}
      />
      {camera}
      {details === 'measurement' ? (
        <Panel title="Measurement details" variant="quiet">
          <AppText>{measurementText(result, metric)}</AppText>
          <AppText>
            A projected angle from the camera, not a validated flexibility test.
          </AppText>
          <AppText variant="caption" muted>
            {metric === 'shoulder_reach'
              ? 'Each side estimates the arm angle relative to your torso in a front-facing view.'
              : 'This estimates the angle between your legs in a front-facing view.'}
          </AppText>
          <AppText variant="caption" muted>
            Camera framing and clothing affect the estimate. Compare results
            with similar positioning.
          </AppText>
        </Panel>
      ) : details === 'capture' ? (
        <Panel title="Capture details" variant="quiet">
          <AppText>
            {phase === 'complete'
              ? 'Steady hold completed.'
              : 'Stopped before a steady hold completed.'}
          </AppText>
          <AppText variant="caption">
            {`Pose confidence ${Math.round(
              result.confidence * 100,
            )}%. This describes pose detection, not measurement accuracy.`}
          </AppText>
          <AppText variant="caption">
            {simulated
              ? 'Simulated on this device. No capture is uploaded. Saves go to your separate demo profile.'
              : `Live camera analysis at ${server}. Sampled frames are discarded after analysis; uploads have stopped.`}
          </AppText>
          <AppText
            variant="caption"
            muted
          >{`Measurement protocol: ${result.protocol}`}</AppText>
        </Panel>
      ) : (
        <>
          <Panel
            title="Measurement"
            badge={
              <Tag
                text={simulated ? 'Simulated' : 'Camera'}
                tone={simulated ? 'example' : 'muted'}
              />
            }
          >
            <AppText>{`Review your result: ${measurementText(
              result,
              metric,
            )}`}</AppText>
            {incompleteRaise ? (
              <AppText variant="caption">
                No clear raising movement was detected. Retry from resting arms
                to measure overhead reach.
              </AppText>
            ) : null}
            <Button
              title="Measurement details"
              variant="secondary"
              small
              onPress={() => setDetails('measurement')}
            />
          </Panel>
          <Panel title="Capture quality" variant="quiet">
            <AppText variant="caption">
              {phase === 'complete'
                ? 'Steady hold completed.'
                : 'Stopped before a steady hold completed.'}
              {` Pose confidence ${Math.round(result.confidence * 100)}%.`}
            </AppText>
            <AppText variant="caption" muted>
              {simulated
                ? 'Simulated on this device. Results stay in your separate demo profile.'
                : `Live camera analysis at ${server}. Sampled frames are discarded after analysis.`}
            </AppText>
            <Button
              title="Capture details"
              variant="secondary"
              small
              onPress={() => setDetails('capture')}
            />
          </Panel>
          <Panel title="Actions" variant={saved ? 'quiet' : 'banana'}>
            {saving ? (
              <AppText accessibilityLiveRegion="polite">
                Saving reviewed result…
              </AppText>
            ) : saved ? (
              <AppText accessibilityLiveRegion="polite">
                {simulated
                  ? 'Saved simulated result to your demo profile.'
                  : 'Saved to your profile.'}
              </AppText>
            ) : (
              <AppText variant="caption">
                Save this reviewed measurement to your profile or try again.
              </AppText>
            )}
            {error ? (
              <AppText accessibilityRole="alert">{error}</AppText>
            ) : null}
            <Button
              title="Save result"
              disabled={saving || saved}
              onPress={onSave}
            />
            <Button
              title="Retry"
              variant="secondary"
              small
              disabled={retryDisabled}
              onPress={onRetry}
            />
          </Panel>
        </>
      )}
    </View>
  );
}
