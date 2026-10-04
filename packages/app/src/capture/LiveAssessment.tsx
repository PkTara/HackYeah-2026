import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import type { AssessmentRecord } from '@hackyeah/core';
import type { LiveSession, MediaClient, PoseResultDto } from '@hackyeah/data';
import type { CameraSession } from '@hackyeah/platform';
import { AppText, Breadcrumbs, Button, Tag, spacing } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import {
  initialStability,
  advanceStability,
  type LiveMetric,
} from './stability';
import { overlayPoints, type PreviewGeometry } from './overlay';
import { Markings } from './Markings';
export type LiveAssessmentProps = {
  media: MediaClient;
  consent: boolean;
  metric: LiveMetric;
  simulated: boolean;
  onSettings: () => void;
  onSave: (records: readonly AssessmentRecord[]) => Promise<void>;
  now?: () => number;
};
export function LiveAssessment({
  media,
  consent,
  metric,
  onSettings,
  onSave,
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
  const [overlayFrame, setOverlayFrame] = useState<PoseResultDto | null>(null);
  const [review, setReview] = useState<PoseResultDto | null>(null);
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
  const resetReview = () => {
    if (saving) {
      return;
    }
    setReview(null);
    setReading(null);
    setOverlayFrame(null);
    recordsRef.current = null;
    setSaved(false);
    setError('');
    stability.current = initialStability(metric);
  };
  const finish = () => {
    setReview(stability.current.latest ?? null);
    stop();
  };
  const save = async () => {
    if (!review || saving || saved) {
      return;
    }
    const occurredAt = new Date(now()).toISOString();
    const common = {
      unit: 'degrees' as const,
      method: 'camera' as const,
      protocol: review.protocol,
      occurredAt,
      confidence: review.confidence,
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
  return (
    <View style={{ gap: spacing.md }}>
      {simulated ? <Tag text="Simulated analysis" /> : null}
      <AppText>
        {metric === 'shoulder_reach'
          ? 'Face the camera with hips, shoulders, elbows and wrists visible. Begin with arms resting at your sides, then raise overhead with straight elbows.'
          : 'Face the camera with your full body visible. Keep hips and ankles clear, then spread your feet comfortably and hold steady.'}
      </AppText>
      <AppText variant="caption" muted>
        {simulated
          ? 'Example analysis runs on this device. Saved results stay in your separate demo profile.'
          : `Sampled frames go to ${media.server} while recording and are discarded after analysis. Stop or leave the screen to end uploads.`}
      </AppText>
      {active ? (
        <AppText accessibilityLiveRegion="polite">
          {!camera
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
            : 'Hold steady for two seconds. Stop is always available.'}
        </AppText>
      ) : null}
      {capability ? (
        <View
          style={[
            styles.preview,
            active ? styles.previewActive : styles.previewOff,
          ]}
          onLayout={event => setWidth(event.nativeEvent.layout.width)}
        >
          <capability.Preview
            active={active}
            mode="assessment"
            onReady={onReady}
            onError={onError}
            onGeometry={onGeometry}
          />
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Markings points={points} />
          </View>
        </View>
      ) : (
        <AppText>There is no camera on this device.</AppText>
      )}
      {active ? (
        <Button title="Stop" onPress={finish} />
      ) : (
        <Button
          title={review ? 'Retry' : 'Record'}
          disabled={saving || !consent || !capability}
          onPress={() => {
            if (!saving && consent && capability) {
              stability.current = initialStability(metric);
              setReading(null);
              setOverlayFrame(null);
              setReview(null);
              setSaved(false);
              recordsRef.current = null;
              setError('');
              setActive(true);
            }
          }}
        />
      )}
      {reading && active ? (
        <AppText>
          {metric === 'shoulder_reach'
            ? `Left ${Math.round(reading.left_value!)}° · Right ${Math.round(
                reading.right_value!,
              )}°`
            : `${Math.round(reading.value!)}°`}
        </AppText>
      ) : null}
      {review ? (
        <View>
          <Breadcrumbs
            crumbs={[
              {
                label:
                  metric === 'shoulder_reach' ? 'Shoulder reach' : 'Leg spread',
                onPress: resetReview,
              },
              { label: 'Review' },
            ]}
          />
          {metric === 'shoulder_reach' &&
          ['baseline', 'raise'].includes(stability.current.phase) ? (
            <AppText>
              No clear raising movement was detected. This is a manually stopped
              projected angle; retry from resting arms to measure your overhead
              reach.
            </AppText>
          ) : null}
          <AppText>
            Review your result:{' '}
            {metric === 'shoulder_reach'
              ? `Left ${Math.round(review.left_value!)}° · Right ${Math.round(
                  review.right_value!,
                )}°`
              : `${Math.round(review.value!)}°`}
          </AppText>
          <Button
            title="Save result"
            disabled={saving || saved}
            onPress={save}
          />
        </View>
      ) : null}
      {saving ? (
        <AppText accessibilityLiveRegion="polite">
          Saving reviewed result…
        </AppText>
      ) : null}
      {saved ? (
        <AppText>
          {simulated
            ? 'Saved simulated result to your demo profile.'
            : 'Saved to your profile.'}
        </AppText>
      ) : null}
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
      <AppText variant="caption" muted>
        A projected angle from the camera, not a validated flexibility test.
        Camera framing and clothing affect the estimate.
      </AppText>
      {!consent ? (
        <>
          <AppText>
            Allow live camera analysis in Settings before recording.
          </AppText>
          <Button title="Settings" onPress={onSettings} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { overflow: 'hidden' },
  previewActive: { height: 280 },
  previewOff: { height: 0 },
});
