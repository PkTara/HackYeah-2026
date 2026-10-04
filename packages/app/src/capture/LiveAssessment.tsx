import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import type { AssessmentRecord } from '@hackyeah/core';
import type {
  LiveSession,
  MediaClient,
  PoseReading,
  PoseResultDto,
} from '@hackyeah/data';
import { fromDecisionDto } from '@hackyeah/data';
import type { CameraSession } from '@hackyeah/platform';
import { AppText, Button, Panel, Tag, spacing } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import {
  initialStability,
  advanceStability,
  validLiveReading,
  type LiveMetric,
} from './stability';
import { CameraReadingHelp } from './parts';
import { overlayPoints, type PreviewGeometry } from './overlay';
import { Markings } from './Markings';
import { AssessmentCameraTray } from './AssessmentCameraTray';
import {
  AssessmentReview,
  measurementText,
  type AssessmentCompletion,
} from './AssessmentReview';
export type LiveAssessmentProps = {
  media: MediaClient;
  consent: boolean;
  metric: LiveMetric;
  simulated: boolean;
  onSettings: () => void;
  onSave: (records: readonly AssessmentRecord[]) => Promise<void>;
  onCompletionChange?: (completion: AssessmentCompletion | undefined) => void;
  now?: () => number;
};
export function LiveAssessment({
  media,
  consent,
  metric,
  onSettings,
  onSave,
  onCompletionChange,
  simulated,
  now = Date.now,
}: LiveAssessmentProps) {
  const capability = useCapabilities().camera;
  const [active, setActive] = useState(false);
  const [camera, setCamera] = useState<CameraSession | null>(null);
  const [geometry, setGeometry] = useState<PreviewGeometry | null>(null);
  const [width, setWidth] = useState(320);
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearStale = useCallback(() => {
    if (staleTimer.current) {
      clearTimeout(staleTimer.current);
      staleTimer.current = null;
    }
  }, []);
  const onGeometry = useCallback(
    (next: PreviewGeometry) => setGeometry(next),
    [],
  );
  const stability = useRef(initialStability(metric));
  const [reading, setReading] = useState<PoseResultDto | null>(null);
  const [sampleReading, setSampleReading] = useState<PoseReading | null>(null);
  const [overlayFrame, setOverlayFrame] = useState<PoseResultDto | null>(null);
  const [review, setReview] = useState<PoseResultDto | null>(null);
  useEffect(() => {
    if (!review) {
      onCompletionChange?.(undefined);
    }
  }, [review, onCompletionChange]);
  useEffect(() => () => onCompletionChange?.(undefined), [onCompletionChange]);
  const recordsRef = useRef<readonly AssessmentRecord[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const live = useRef<LiveSession | null>(null);
  const generation = useRef(0);
  const invalidate = useCallback((step: number) => {
    if (generation.current === step) {
      generation.current++;
    }
  }, []);
  const onReady = useCallback(
    (session: CameraSession | null) => setCamera(session),
    [],
  );
  const stop = useCallback(() => {
    clearStale();
    generation.current++;
    live.current?.stop();
    live.current = null;
    setActive(false);
    setCamera(null);
    setReading(null);
    setOverlayFrame(null);
  }, [clearStale]);
  const onError = useCallback(
    (message: string) => {
      setError(message);
      stop();
    },
    [stop],
  );
  useEffect(() => {
    if (!consent) {
      stop();
    }
  }, [consent, stop]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      // Camera permission prompts may briefly inactivate the app before a
      // session exists. Once live, inactive must stop uploads too.
      if (
        state === 'background' ||
        (state === 'inactive' && live.current !== null)
      ) {
        stop();
      }
    });
    return () => subscription.remove();
  }, [stop]);
  useEffect(
    () => () => {
      clearStale();
      generation.current++;
      live.current?.stop();
      live.current = null;
    },
    [clearStale],
  );
  useEffect(() => {
    if (!active || !camera || !consent) {
      return;
    }
    const step = ++generation.current;
    stability.current = initialStability(metric);
    setReading(null);
    setOverlayFrame(null);
    let owned: LiveSession | null = null;
    media
      .startLive(
        camera,
        consent,
        {
          onResult: result => {
            if (step === generation.current) {
              if (result.metric !== metric) {
                clearStale();
                stability.current = initialStability(metric);
                setReading(null);
                setOverlayFrame(null);
                return;
              }
              setSampleReading(previous => ({
                result: validLiveReading(result)
                  ? result
                  : previous?.result ?? null,
                last: result,
                valid:
                  (previous?.valid ?? 0) + (validLiveReading(result) ? 1 : 0),
                total: (previous?.total ?? 0) + 1,
              }));
              setOverlayFrame(result);
              stability.current = advanceStability(stability.current, result);
              setReading(stability.current.latest ?? null);
              clearStale();
              staleTimer.current = setTimeout(() => {
                if (step === generation.current) {
                  stability.current = {
                    ...stability.current,
                    phase: stability.current.baseline
                      ? 'raise'
                      : metric === 'shoulder_reach'
                      ? 'baseline'
                      : 'hold',
                    samples: [],
                    latest: undefined,
                  };
                  setReading(null);
                  setOverlayFrame(null);
                }
              }, 1501);
              if (stability.current.phase === 'complete') {
                setReview(result);
                stop();
              }
            }
          },
          onError: message => {
            if (step === generation.current) {
              onError(message);
            }
          },
          onStopped: () => {
            if (step === generation.current) {
              setReview(stability.current.latest ?? null);
              stop();
            }
          },
        },
        { metric },
      )
      .then(session => {
        if (step !== generation.current) {
          session.stop();
        } else {
          owned = session;
          live.current = session;
        }
      })
      .catch(failure => {
        if (step === generation.current) {
          onError(
            failure instanceof Error
              ? failure.message
              : 'Live analysis did not start.',
          );
        }
      });
    return () => {
      invalidate(step);
      clearStale();
      if (owned && live.current === owned) {
        live.current = null;
        owned.stop();
      }
    };
  }, [
    active,
    camera,
    consent,
    media,
    metric,
    stop,
    clearStale,
    onError,
    invalidate,
  ]);
  const resetReview = useCallback(() => {
    if (saving) {
      return;
    }
    setReview(null);
    setSampleReading(null);
    setReading(null);
    setOverlayFrame(null);
    recordsRef.current = null;
    setSaved(false);
    setError('');
    stability.current = initialStability(metric);
  }, [metric, saving]);
  const finish = () => {
    setReview(stability.current.latest ?? null);
    stop();
  };
  const save = async () => {
    if (!review || saving || saved) {
      return;
    }
    const occurredAt = new Date(now()).toISOString();
    const returnedDecision = fromDecisionDto(review.decision);
    const savedDecision = returnedDecision
      ? {
          ...returnedDecision,
          limitations: [
            ...new Set([
              ...returnedDecision.limitations,
              'User-confirmed reading and client-supplied explanation; saving does not independently verify the measurement or its provenance.',
            ]),
          ],
        }
      : undefined;
    const common = {
      unit: 'degrees' as const,
      method: 'camera' as const,
      protocol: review.protocol,
      occurredAt,
      confidence: review.confidence,
      decision: savedDecision,
      simulated,
    };
    const records: readonly AssessmentRecord[] =
      recordsRef.current ??
      (metric === 'shoulder_reach'
        ? (['left', 'right'] as const).map(side => ({
            ...common,
            id: `camera-${now()}-${side}`,
            metric:
              side === 'left' ? 'shoulder_reach_left' : 'shoulder_reach_right',
            side,
            value: side === 'left' ? review.left_value! : review.right_value!,
          }))
        : [
            {
              ...common,
              id: `camera-${now()}-leg`,
              metric: 'leg_spread',
              value: review.value!,
            },
          ]);
    recordsRef.current = records;
    setSaving(true);
    setError('');
    try {
      await onSave(records);
      setSaved(true);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Saving failed. Try again.',
      );
    } finally {
      setSaving(false);
    }
  };
  const points =
    overlayFrame && geometry
      ? overlayPoints(
          overlayFrame,
          {
            ...geometry,
            imageWidth: overlayFrame.image_width ?? geometry.imageWidth,
            imageHeight: overlayFrame.image_height ?? geometry.imageHeight,
          },
          width,
          280,
          0,
        )
      : [];
  const record = () => {
    if (!saving && consent && capability) {
      stability.current = initialStability(metric);
      setReading(null);
      setOverlayFrame(null);
      setReview(null);
      setSaved(false);
      recordsRef.current = null;
      setError('');
      setSampleReading({ result: null, last: null, valid: 0, total: 0 });
      setActive(true);
    }
  };
  const cameraTray = (
    <AssessmentCameraTray
      active={active}
      ready={Boolean(camera)}
      available={Boolean(capability)}
      consent={consent}
      reviewing={Boolean(review)}
      error={review ? '' : error}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {capability ? (
        <capability.Preview
          active={active}
          mode="assessment"
          onReady={onReady}
          onError={onError}
          onGeometry={onGeometry}
        />
      ) : null}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Markings points={points} />
      </View>
    </AssessmentCameraTray>
  );
  if (review) {
    return (
      <AssessmentReview
        result={review}
        reading={
          sampleReading ? { ...sampleReading, result: review } : undefined
        }
        metric={metric}
        phase={stability.current.phase}
        simulated={simulated}
        server={media.server}
        saving={saving}
        saved={saved}
        error={error}
        retryDisabled={saving || !consent || !capability}
        onReset={resetReview}
        onRetry={record}
        onSave={save}
        onCompletionChange={onCompletionChange}
        camera={cameraTray}
      />
    );
  }
  const status = !active
    ? !capability
      ? 'A camera is needed to record.'
      : !consent
      ? 'Allow live camera analysis in Settings before recording.'
      : 'Ready to record. A steady hold completes automatically.'
    : !camera
    ? 'Starting camera…'
    : overlayFrame?.reason
    ? overlayFrame.reason
    : !reading
    ? metric === 'shoulder_reach'
      ? 'Keep hips, shoulders, elbows and wrists visible. Start with resting arms.'
      : 'Keep hips and ankles visible. Spread your feet comfortably.'
    : stability.current.phase === 'baseline'
    ? 'Rest both arms below your shoulders to establish your starting position.'
    : stability.current.phase === 'raise'
    ? 'Raise either arm overhead, keeping elbows straight.'
    : 'Hold steady for two seconds. Stop is always available.';
  return (
    <View style={{ gap: spacing.md }}>
      {cameraTray}
      <Panel
        title="Recording"
        badge={simulated ? <Tag text="Simulated analysis" /> : undefined}
      >
        <AppText
          testID="assessment-live-status"
          accessibilityLiveRegion="polite"
        >
          {status}
        </AppText>
        {reading && active ? (
          <AppText variant="caption">
            {measurementText(reading, metric)}
          </AppText>
        ) : null}
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        {active ? (
          <Button title="Stop" variant="danger" onPress={finish} />
        ) : (
          <Button
            title="Record"
            disabled={saving || !consent || !capability}
            onPress={record}
          />
        )}
        {!consent ? (
          <Button
            title="Settings"
            variant="secondary"
            small
            onPress={onSettings}
          />
        ) : null}
        <AppText variant="caption" muted>
          {simulated
            ? 'Example analysis runs on this device. Saved results stay in your separate demo profile.'
            : `Sampled frames go to ${media.server} while recording and are discarded after analysis. Stop or leave to end uploads.`}
        </AppText>
        {sampleReading && (!active || sampleReading.total > 0) ? (
          <CameraReadingHelp reading={sampleReading} />
        ) : null}
      </Panel>
      <Panel title="How to measure" variant="quiet">
        <AppText variant="caption">
          {metric === 'shoulder_reach'
            ? 'Face the camera with hips, shoulders, elbows and wrists visible. Begin with arms resting at your sides, then raise overhead with straight elbows.'
            : 'Face the camera with your full body visible. Keep hips and ankles clear, spread your feet comfortably and hold steady.'}
        </AppText>
        <AppText variant="caption" muted>
          A projected angle from the camera, not a validated flexibility test.
        </AppText>
      </Panel>
    </View>
  );
}
