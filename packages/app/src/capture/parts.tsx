import { explainCamera, type DecisionExplanation } from '@hackyeah/core';
import { fromDecisionDto, type PoseReading } from '@hackyeah/data';
import { DecisionHelp } from '../components/DecisionHelp';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Divider,
  Icon,
  PX,
  Panel,
  Tag,
  spacing,
  useTheme,
} from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { MAX_CLIP_MS, type Capture } from './useCapture';

/**
 * The camera tray: the live preview and what you can do with it. The
 * preview never leaves the device; the screens ask before anything is sent.
 */
export function CameraTray({
  capture: c,
  photoLabel = 'Take photo',
  children,
}: {
  capture: Capture;
  photoLabel?: string;
  /** More controls under a divider, e.g. live analysis. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const camera = useCapabilities().camera;
  if (!camera) {
    return (
      <Panel variant="quiet" title="Camera">
        <AppText>There is no camera on this device.</AppText>
      </Panel>
    );
  }
  const { Preview } = camera;
  const seconds = MAX_CLIP_MS / 1000;
  return (
    <Panel
      title="Camera"
      badge={
        c.recording ? (
          <Tag text="Recording" tone="paused" />
        ) : c.live ? (
          <Tag text="Live" tone="focus" />
        ) : null
      }
    >
      <View
        style={[
          styles.preview,
          c.active
            ? {
                backgroundColor: theme.colors.backgroundDeep,
                borderColor: theme.colors.outline,
              }
            : styles.off,
        ]}
      >
        <Preview
          active={c.active}
          mode={c.mode}
          onReady={c.onReady}
          onError={c.onError}
        />
      </View>
      <AppText variant="caption" muted>
        {c.active
          ? 'The preview stays on this device.'
          : c.capture
          ? 'Camera off while you review.'
          : 'The camera is off. Nothing is recorded until you start it.'}
      </AppText>
      <View style={styles.row}>
        {c.active ? (
          <>
            <Button
              title={photoLabel}
              icon="check"
              small
              disabled={!c.camera || c.recording || c.busy || c.live}
              onPress={() => {
                c.snapshot();
              }}
            />
            {c.mode === 'assessment' && c.canRecord ? (
              <Button
                title={c.recording ? 'Stop recording' : 'Record clip'}
                variant={c.recording ? 'danger' : 'secondary'}
                small
                disabled={c.busy || c.live}
                onPress={() => {
                  if (c.recording) {
                    c.finishRecording();
                  } else {
                    c.startRecording();
                  }
                }}
              />
            ) : null}
            <Button
              title="Stop camera"
              variant="secondary"
              small
              onPress={c.stop}
            />
          </>
        ) : c.capture ? null : (
          <Button title="Start camera" small onPress={c.start} />
        )}
      </View>
      {c.recording ? (
        <AppText variant="caption">
          Recording. It stops by itself after {seconds} seconds.
        </AppText>
      ) : null}
      {c.active && c.camera && c.mode === 'assessment' && !c.canRecord ? (
        <AppText variant="caption" muted>
          This device cannot record clips here yet. Take a photo or go live.
        </AppText>
      ) : null}
      {children ? (
        <>
          <Divider />
          {children}
        </>
      ) : null}
    </Panel>
  );
}

/** The photo or clip under review, with a way to take it again. */
export function ReviewTray({ capture: c }: { capture: Capture }) {
  const camera = useCapabilities().camera;
  if (!c.capture || !camera) {
    return null;
  }
  const { MediaPreview } = camera;
  const what = c.capture.kind === 'video' ? 'clip' : 'photo';
  return (
    <Panel title="Review">
      <View style={styles.media}>
        <MediaPreview capture={c.capture} />
      </View>
      <AppText variant="caption" muted>
        Check the {what} first. It is sent only when you agree below.
      </AppText>
      <Button
        title="Retake"
        variant="secondary"
        small
        style={styles.start}
        onPress={c.retake}
      />
    </Panel>
  );
}

/** Where media goes, said before the climber agrees to send it. */
export function ServerNote({
  server,
  children,
  simulated = false,
}: {
  server: string;
  children: ReactNode;
  simulated?: boolean;
}) {
  return (
    <View style={styles.note}>
      <Icon name="lock" />
      <AppText variant="caption" style={styles.grow}>
        {simulated ? (
          'Simulated on this device. No capture is uploaded. Saved demo results and entries stay separate from your normal profile.'
        ) : (
          <>
            Goes to{' '}
            <AppText variant="caption" style={styles.strong}>
              {server}
            </AppText>
            {'. '}
            {children}
          </>
        )}
      </AppText>
    </View>
  );
}

/** What a camera screen says in the on-device demo, instead of a result. */
export function NeedsServer({ what }: { what: string }) {
  return (
    <Panel variant="quiet" title="Needs the server">
      <AppText>
        {what} needs the Climbing Monkey server, and this build keeps everything
        on this device. Nothing is faked here.
      </AppText>
      <AppText variant="caption" muted>
        Demo mode can simulate it for a presentation.
      </AppText>
    </Panel>
  );
}

/** The latest error or confirmation, read out when it appears. */
export function Status({ error, notice }: { error: string; notice?: string }) {
  const theme = useTheme();
  return (
    <View accessibilityLiveRegion="polite">
      {error ? (
        <AppText
          accessibilityRole="alert"
          variant="caption"
          style={{ color: theme.colors.danger }}
        >
          {error}
        </AppText>
      ) : notice ? (
        <View style={styles.inline}>
          <Icon name="check" />
          <AppText accessibilityRole="alert" variant="caption">
            {notice}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { borderWidth: PX, height: 280, overflow: 'hidden' },
  off: { height: 0, borderWidth: 0 },
  media: { minHeight: 120 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
  strong: { fontWeight: '800' },
});

/** Explain only returned camera metadata; never reconstruct missing pose inputs. */
export function CameraReadingHelp({ reading }: { reading: PoseReading }) {
  const { result, last, valid, total } = reading;
  const base: DecisionExplanation = result
    ? explainCamera({
        ...result,
        value: result.value,
        metric: result.metric,
        leftValue: result.left_value ?? undefined,
        rightValue: result.right_value ?? undefined,
        decision: fromDecisionDto(result.decision),
      })
    : fromDecisionDto(last?.decision) ?? {
        summary: 'No valid camera reading returned',
        status: 'estimate',
        rule: 'No valid sample was returned for display or saving. The returned reason, when present, is shown below; detailed capture-quality criteria and landmark inputs are unavailable unless supplied by the server.',
        evidence: [
          {
            id: 'camera-result',
            label: 'Returned camera result',
            detail: `Reason: ${last?.reason ?? 'unavailable'}; confidence: ${
              last?.confidence ?? 'unavailable'
            }; protocol: ${last?.protocol ?? 'unavailable'}; method: ${
              last?.method ?? 'unavailable'
            }.`,
          },
        ],
        sourceIds: [],
        limitations: [
          'An unavailable reading does not assess flexibility. Capture date, model version and original landmark inputs are unavailable when the server does not supply them.',
        ],
      };
  const offset =
    result &&
    'timestamp_ms' in result &&
    typeof result.timestamp_ms === 'number'
      ? result.timestamp_ms
      : undefined;
  return (
    <DecisionHelp
      label="camera reading"
      explanation={{
        ...base,
        rule: `${base.rule} The displayed reading is the latest valid sample, not the average. Live usable counts follow the capture checks: valid angles, pose visibility, confidence and sample timing. Compatibility photo/clip counts reflect their returned analysis totals.`,
        evidence: [
          ...base.evidence,
          {
            id: 'reading-samples',
            label: 'Current analysis samples',
            detail: `${valid} of ${total} usable. Latest sample status: ${
              last?.status ?? 'unavailable'
            }; rejection reason: ${last?.reason ?? 'none supplied'}.${
              offset === undefined
                ? ''
                : ` Relative sample offset: ${offset} ms; this is not an absolute capture date.`
            }`,
          },
        ],
      }}
    />
  );
}
