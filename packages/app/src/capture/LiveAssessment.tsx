import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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
import {
  AppText,
  Button,
  Column,
  Columns,
  Divider,
  Panel,
  spacing,
  type Crumb,
} from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import type { NextStep } from '../components/SavedNote';
import { NumberedList } from '../onboarding/bits';
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
  measurementShort,
  measurementText,
  type AssessmentCompletion,
} from './AssessmentReview';

/** Three short steps per measurement, shown beside the camera. */
const HOW_TO: Readonly<Record<LiveMetric, readonly string[]>> = {
  leg_spread: [
    'Face the camera with your whole body in view.',
    'Spread your feet as wide as is comfortable.',
    'Hold still. Two steady seconds finish on their own.',
  ],
  shoulder_reach: [
    'Face the camera with hips, shoulders, elbows and wrists in view.',
    'Begin with arms resting at your sides.',
    'Raise one or both arms overhead with straight elbows, then hold.',
  ],
};

export type LiveAssessmentProps = {
  media: MediaClient;
  consent: boolean;
  metric: LiveMetric;
  simulated: boolean;
  onSettings: () => void;
  onSave: (records: readonly AssessmentRecord[]) => Promise<void>;
  onCompletionChange?: (completion: AssessmentCompletion | undefined) => void;
  /** The page's breadcrumb trail, continued by the review's own steps. */
  crumbs?: readonly Crumb[];
  /** The page title, which the review shows under its breadcrumb. */
  header?: ReactNode;
  /** Where to go after a save. */
  next?: readonly NextStep[];
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
  crumbs,
  header,
  next,
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
    (value: PreviewGeometry) => setGeometry(value),
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
  const tray = (below?: ReactNode) => (
    <AssessmentCameraTray
      active={active}
      ready={Boolean(camera)}
      available={Boolean(capability)}
      consent={consent}
      reviewing={Boolean(review)}
      error={review ? '' : error}
      simulated={simulated}
      reading={
        reading && active
          ? {
              value: measurementShort(reading, metric),
              label: `Live reading: ${measurementText(reading, metric)}`,
            }
          : undefined
      }
      captured={
        review
          ? {
              value: measurementShort(review, metric),
              label: `Review your result: ${measurementText(review, metric)}`,
            }
          : undefined
      }
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      below={below}
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
        camera={tray()}
        crumbs={crumbs}
        header={header}
        next={next}
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
  // An invalid pose's correction gets the same weight as the guidance.
  const correcting = active && Boolean(overlayFrame?.reason);
  const controls = (
    <View style={styles.controls}>
      <AppText
        testID="assessment-live-status"
        accessibilityLiveRegion="polite"
        style={correcting ? styles.correction : styles.status}
      >
        {status}
      </AppText>
      {reading && active ? (
        <AppText variant="caption">
          {`Live reading: ${measurementText(reading, metric)}`}
        </AppText>
      ) : null}
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
      {active ? (
        <Button title="Stop" variant="danger" onPress={finish} />
      ) : (
        <View style={styles.actions}>
          <View style={styles.grow}>
            <Button
              title="Record"
              icon="camera"
              disabled={saving || !consent || !capability}
              onPress={record}
            />
          </View>
          {!consent ? (
            <View style={styles.grow}>
              <Button title="Settings" variant="secondary" onPress={onSettings} />
            </View>
          ) : null}
        </View>
      )}
      <AppText variant="caption" muted>
        {simulated
          ? 'Simulated analysis runs on this device. Saved results stay in your separate demo profile.'
          : `While recording, sampled frames go to ${media.server} and are discarded after analysis. Stop or leave to end uploads.`}
      </AppText>
      {sampleReading && (!active || sampleReading.total > 0) ? (
        <CameraReadingHelp reading={sampleReading} />
      ) : null}
    </View>
  );
  // Wide screens: the camera on the left, the steps beside it.
  return (
    <Columns>
      <Column>{tray(controls)}</Column>
      <Column>
        <HowToMeasure metric={metric} />
      </Column>
    </Columns>
  );
}

/** The three steps, then the one caveat that matters. */
export function HowToMeasure({ metric }: { metric: LiveMetric }) {
  return (
    <Panel title="How to measure" variant="quiet">
      <NumberedList items={HOW_TO[metric]} />
      <Divider />
      <AppText variant="caption" muted>
        A projected angle from the camera, not a validated flexibility test.
      </AppText>
    </Panel>
  );
}

const styles = StyleSheet.create({
  controls: { gap: spacing.sm + 2 },
  status: { fontWeight: '700' },
  correction: { fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  grow: { flex: 1 },
});
