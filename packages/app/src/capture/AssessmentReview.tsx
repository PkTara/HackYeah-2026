import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PoseReading, PoseResultDto } from '@hackyeah/data';
import {
  AppText,
  Breadcrumbs,
  Button,
  Column,
  Columns,
  Divider,
  Panel,
  Tag,
  spacing,
  type Crumb,
} from '@hackyeah/ui';
import { SavedNote, type NextStep } from '../components/SavedNote';
import { CameraReadingHelp } from './parts';
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

/** The value as the camera box shows it: short enough for the pixel font. */
export function measurementShort(result: PoseResultDto, metric: LiveMetric) {
  return metric === 'shoulder_reach'
    ? `L ${Math.round(result.left_value!)}°\nR ${Math.round(
        result.right_value!,
      )}°`
    : `${Math.round(result.value!)}°`;
}

/**
 * Review navigation lives here; the owner retains the capture and save state.
 * The page is three things: the camera box holding the captured reading, one
 * Result tray with quality, the save and retry actions and the two detail
 * links, and, after a save, what changed and where to go next.
 */
export function AssessmentReview({
  result,
  reading,
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
  crumbs = [],
  header,
  next = [],
}: {
  result: PoseResultDto;
  reading?: PoseReading;
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
  /**
   * The page's own trail (Data > Leg spread > Record leg spread), so the
   * review reads as one breadcrumb. Its last step goes back to capture.
   */
  crumbs?: readonly Crumb[];
  /** The page title, shown under the breadcrumb. */
  header?: ReactNode;
  /** Where to go after a save, e.g. the saved results. */
  next?: readonly NextStep[];
}) {
  const [details, setDetails] = useState<'measurement' | 'capture' | null>(
    null,
  );
  const title = metric === 'shoulder_reach' ? 'Shoulder reach' : 'Leg spread';
  const incompleteRaise =
    metric === 'shoulder_reach' && ['baseline', 'raise'].includes(phase);
  const steady = phase === 'complete';
  const confidence = `Pose found with ${Math.round(
    result.confidence * 100,
  )}% confidence`;
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
  const page = crumbs.length
    ? crumbs
        .slice(0, -1)
        .concat({ ...crumbs[crumbs.length - 1], onPress: onReset })
    : [{ label: title, onPress: onReset }];
  return (
    <View style={styles.stack}>
      <Breadcrumbs
        crumbs={[
          ...page,
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
      {header}
      {/* Wide screens: the captured reading on the left, the result beside it. */}
      <Columns>
        <Column>{camera}</Column>
        <Column>
      {details === 'measurement' ? (
        <Panel title="Measurement details" variant="quiet">
          <AppText variant="heading">{measurementText(result, metric)}</AppText>
          <AppText>
            A projected angle from the camera, not a validated flexibility test.
          </AppText>
          <AppText variant="caption" muted>
            {metric === 'shoulder_reach'
              ? 'Each side estimates the arm angle relative to your torso in a front-facing view.'
              : 'This estimates the angle between your legs in a front-facing view.'}
          </AppText>
          <AppText variant="caption" muted>
            Framing and clothing change the estimate. Compare results taken in
            the same spot.
          </AppText>
          <CameraReadingHelp
            reading={
              reading ?? {
                result,
                last: result,
                valid: 1,
                total: 1,
              }
            }
          />
        </Panel>
      ) : details === 'capture' ? (
        <Panel title="Capture details" variant="quiet">
          <AppText>
            {steady
              ? 'Steady hold completed.'
              : 'Stopped before a steady hold completed.'}
          </AppText>
          <AppText variant="caption">
            {`${confidence}. This describes pose detection, not measurement accuracy.`}
          </AppText>
          <AppText variant="caption">
            {simulated
              ? 'Simulated on this device. No capture is uploaded. Saves go to your separate demo profile.'
              : `Live camera analysis at ${server}. Sampled frames are discarded after analysis; uploads have stopped.`}
          </AppText>
          <AppText
            variant="caption"
            muted
          >{`Method version: ${result.protocol}`}</AppText>
        </Panel>
      ) : (
        <Panel
          title="Result"
          variant={saved ? 'sign' : 'banana'}
          badge={simulated ? <Tag text="Simulated" /> : undefined}
        >
          <AppText style={styles.lead}>{`${
            saved ? 'Your result' : 'Review your result'
          }: ${measurementText(result, metric)}`}</AppText>
          <AppText variant="caption">
            {steady ? 'Steady hold completed. ' : 'Stopped before a steady hold. '}
            {`${confidence}.`}
          </AppText>
          {incompleteRaise ? (
            <AppText variant="caption">
              No clear raising movement was detected. Retry from resting arms
              to measure overhead reach.
            </AppText>
          ) : null}
          {saving ? (
            <AppText accessibilityLiveRegion="polite">
              Saving reviewed result…
            </AppText>
          ) : saved ? (
            <SavedNote
              title={
                simulated
                  ? 'Saved simulated result to your demo profile'
                  : 'Saved to your profile'
              }
              lines={[
                `${title} now shows ${measurementText(
                  result,
                  metric,
                )} with your earlier results.`,
              ]}
              next={next}
            />
          ) : (
            <AppText variant="caption" muted>
              Nothing is saved until you choose Save result.
            </AppText>
          )}
          {error ? (
            <AppText accessibilityRole="alert">{error}</AppText>
          ) : null}
          {/* Once saved, the note above carries the next step. */}
          {saved ? null : (
            <Button
              title="Save result"
              icon="check"
              disabled={saving}
              onPress={onSave}
            />
          )}
          <Divider />
          <View style={styles.links}>
            <Button
              title="Retry"
              variant="secondary"
              small
              disabled={retryDisabled}
              onPress={onRetry}
            />
            <Button
              title="Measurement details"
              variant="secondary"
              small
              onPress={() => setDetails('measurement')}
            />
            <Button
              title="Capture details"
              variant="secondary"
              small
              onPress={() => setDetails('capture')}
            />
          </View>
        </Panel>
      )}
        </Column>
      </Columns>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  lead: { fontWeight: '800' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
