import {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
  type ComponentType,
} from 'react';
import {
  CameraPreview,
  CaptureMediaPreview,
  type CameraPreviewProps,
  type CaptureMode,
  type CameraSession,
  type MediaCapture,
} from '@hackyeah/platform';
import { AppState, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, Screen } from '@hackyeah/ui';
import { createClimbingApi, type PoseResult, type VideoResult } from '../api';
import { openLivePose, type LiveSocket } from '../livePose';
import { useCapabilities } from '../capabilities';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';

export type CaptureScreenProps = {
  mode: CaptureMode;
  api?: ReturnType<typeof createClimbingApi>;
  Preview?: ComponentType<CameraPreviewProps>;
};
export function CaptureScreen({
  mode,
  api: injectedApi,
  Preview = CameraPreview,
}: CaptureScreenProps) {
  const { storage } = useCapabilities();
  const api = useMemo(
    () => injectedApi ?? createClimbingApi(storage),
    [injectedApi, storage],
  );
  const [active, setActive] = useState(false);
  const [camera, setCamera] = useState<CameraSession | null>(null);
  const [error, setError] = useState('');
  const [side, setSide] = useState<'left' | 'right'>('left');
  const [view, setView] = useState<'palm' | 'back'>('palm');
  const [region, setRegion] = useState('palm');
  const [pain, setPain] = useState('0');
  const [note, setNote] = useState('');
  const painValue = Number(pain);
  const validPain =
    pain.trim() !== '' &&
    Number.isInteger(painValue) &&
    painValue >= 0 &&
    painValue <= 10;
  const [live, setLive] = useState(false);
  const liveSession = useRef<ReturnType<typeof openLivePose> | null>(null);
  const liveCounts = useRef({ valid: 0, total: 0 });
  const nativeCapturePending = useRef(false);
  const [recording, setRecording] = useState(false);
  const recordingSession = useRef<CameraSession | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [counts, setCounts] = useState<{ valid: number; total: number } | null>(
    null,
  );
  const [uploadConsent, setUploadConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<PoseResult | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [capture, setCapture] = useState<MediaCapture | null>(null);
  const heldCapture = useRef<MediaCapture | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const replaceCapture = (next: MediaCapture | null) => {
    heldCapture.current?.release?.();
    heldCapture.current = next;
    setCapture(next);
    setUploadConsent(false);
    setConfirmed(false);
    setResult(null);
    setCounts(null);
    setBusy(false);
    setNotice('');
    setError('');
  };
  const dispose = useCallback(() => {
    generation.current++;
    liveSession.current?.stop();
    liveSession.current = null;
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    const session = recordingSession.current;
    recordingSession.current = null;
    if (session?.stopRecording) {
      session
        .stopRecording()
        .then(media => media.release?.())
        .catch(() => {});
    }
    heldCapture.current?.release?.();
    heldCapture.current = null;
  }, []);
  const stopCamera = useCallback(() => {
    dispose();
    setActive(false);
    setCamera(null);
    setCapture(null);
    setResult(null);
    setCounts(null);
    setConfirmed(false);
    setUploadConsent(false);
    setBusy(false);
    setLive(false);
    setRecording(false);
  }, [dispose]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'inactive') {
        liveSession.current?.stop();
        liveSession.current = null;
        setLive(false);
        return;
      }
      if (state === 'background') {
        if (nativeCapturePending.current) {
          liveSession.current?.stop();
          liveSession.current = null;
          setLive(false);
          setCamera(null);
          return;
        }
        stopCamera();
      }
    });
    return () => {
      mounted.current = false;
      dispose();
      subscription?.remove();
    };
  }, [dispose, stopCamera]);
  const snapshot = async () => {
    if (!camera || live || busy || recording) {
      return;
    }
    const operation = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const next = await camera.snapshot();
      if (operation !== generation.current) {
        next.release?.();
        return;
      }
      replaceCapture(next);
      setActive(false);
    } catch (failure) {
      if (operation === generation.current) {
        setError(
          failure instanceof Error ? failure.message : 'Snapshot failed',
        );
      }
    } finally {
      if (operation === generation.current) {
        setBusy(false);
      }
    }
  };
  const analyze = async () => {
    if (!capture || !uploadConsent || busy) {
      return;
    }
    const operation = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const response = await api.analyze(capture, uploadConsent);
      if (operation !== generation.current) {
        return;
      }
      setResult(
        'frames' in response
          ? (response as VideoResult).frames
              .filter(frame => frame.status === 'ok')
              .at(-1) ?? null
          : response,
      );
      setCounts(
        'frames' in response
          ? {
              valid: response.valid_frame_count,
              total: response.sampled_frame_count,
            }
          : { valid: response.status === 'ok' ? 1 : 0, total: 1 },
      );
      setConfirmed(false);
    } catch (failure) {
      if (operation === generation.current) {
        setError(
          failure instanceof Error ? failure.message : 'Analysis failed',
        );
      }
    } finally {
      if (operation === generation.current) {
        setBusy(false);
      }
    }
  };
  const saveMeasurement = async () => {
    if (
      !result ||
      result.status !== 'ok' ||
      result.value === null ||
      !confirmed ||
      busy ||
      live
    ) {
      return;
    }
    const operation = ++generation.current;
    setBusy(true);
    try {
      await api.saveAssessment(result, confirmed);
      if (operation === generation.current) {
        setNotice('Measurement saved');
      }
    } catch (failure) {
      if (operation === generation.current) {
        setError(failure instanceof Error ? failure.message : 'Save failed');
      }
    } finally {
      if (operation === generation.current) {
        setBusy(false);
      }
    }
  };
  const saveHand = async () => {
    if (
      !capture ||
      capture.kind !== 'image' ||
      !uploadConsent ||
      !validPain ||
      busy
    ) {
      return;
    }
    const operation = ++generation.current;
    setBusy(true);
    setError('');
    try {
      await api.saveHand(
        capture,
        { side, view, region, pain: painValue, note },
        uploadConsent,
      );
      if (operation === generation.current) {
        setNotice('Hand journal saved');
      }
    } catch (failure) {
      if (operation === generation.current) {
        setError(failure instanceof Error ? failure.message : 'Save failed');
      }
    } finally {
      if (operation === generation.current) {
        setBusy(false);
      }
    }
  };
  const stopLive = () => {
    liveSession.current?.stop();
    liveSession.current = null;
    setLive(false);
  };
  const startLive = async () => {
    if (!camera || !uploadConsent || live || busy || recording) {
      return;
    }
    const operation = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const token = await api.token();
      if (operation !== generation.current) {
        return;
      }
      liveCounts.current = { valid: 0, total: 0 };
      setCounts(null);
      setResult(null);
      setConfirmed(false);
      setLive(true);
      liveSession.current = openLivePose({
        url: api.socketUrl,
        token,
        consent: uploadConsent,
        camera,
        socketFactory: url => new WebSocket(url) as unknown as LiveSocket,
        onResult: next => {
          if (operation !== generation.current) {
            return;
          }
          setResult(next);
          setConfirmed(false);
          liveCounts.current = {
            valid: liveCounts.current.valid + (next.status === 'ok' ? 1 : 0),
            total: liveCounts.current.total + 1,
          };
          setCounts(liveCounts.current);
        },
        onError: message => {
          if (operation === generation.current) {
            setError(message);
          }
        },
        onStopped: () => {
          if (operation === generation.current) {
            setLive(false);
          }
        },
      });
    } catch (failure) {
      if (operation === generation.current) {
        setLive(false);
        setError(
          failure instanceof Error ? failure.message : 'Live analysis failed',
        );
      }
    } finally {
      if (operation === generation.current) {
        setBusy(false);
      }
    }
  };
  const finishRecording = async () => {
    const session = recordingSession.current;
    if (!session?.stopRecording) {
      return;
    }
    recordingSession.current = null;
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    const operation = generation.current;
    try {
      const next = await session.stopRecording();
      if (operation !== generation.current) {
        next.release?.();
        return;
      }
      replaceCapture(next);
      setRecording(false);
      setActive(false);
    } catch (failure) {
      if (operation === generation.current) {
        setRecording(false);
        setError(
          failure instanceof Error ? failure.message : 'Recording failed',
        );
      }
    }
  };
  const recordVideo = async () => {
    if (!camera || busy || recording || live) {
      return;
    }
    const operation = ++generation.current;
    setError('');
    if (camera.startRecording && camera.stopRecording) {
      setRecording(true);
      recordingSession.current = camera;
      try {
        await camera.startRecording();
        if (operation !== generation.current) {
          camera
            .stopRecording()
            .then(media => media.release?.())
            .catch(() => {});
          return;
        }
        recordingTimer.current = setTimeout(() => {
          finishRecording();
        }, 30000);
      } catch (failure) {
        if (operation === generation.current) {
          recordingSession.current = null;
          setRecording(false);
          setError(
            failure instanceof Error ? failure.message : 'Recording failed',
          );
        }
      }
    } else if (camera.recordVideo) {
      nativeCapturePending.current = true;
      setBusy(true);
      try {
        const next = await camera.recordVideo();
        if (operation !== generation.current) {
          next?.release?.();
          return;
        }
        if (next) {
          replaceCapture(next);
          setActive(false);
        }
      } catch (failure) {
        if (operation === generation.current) {
          setError(
            failure instanceof Error ? failure.message : 'Recording failed',
          );
        }
      } finally {
        nativeCapturePending.current = false;
        if (operation === generation.current) {
          setBusy(false);
        }
      }
    }
  };
  const onReady = useCallback((session: CameraSession | null) => {
    if (mounted.current) {
      setCamera(session);
    }
  }, []);
  const onError = useCallback((message: string) => {
    if (mounted.current) {
      setError(message);
      setActive(false);
      setCamera(null);
    }
  }, []);
  return (
    <Screen>
      <AppText style={styles.accent}>🌿 Climbing Monkey</AppText>
      <AppText variant="title">
        {mode === 'assessment' ? 'Camera assessment' : 'Hand journal'}
      </AppText>
      <View style={active ? styles.preview : undefined}>
        <Preview
          active={active}
          mode={mode}
          onReady={onReady}
          onError={onError}
        />
      </View>
      {!active && (
        <Button
          title="Start camera"
          onPress={() => {
            generation.current++;
            replaceCapture(null);
            setError('');
            setActive(true);
          }}
        />
      )}
      {active && (
        <Button title="Stop camera" variant="secondary" onPress={stopCamera} />
      )}
      {active && (
        <Button
          title="Snapshot"
          disabled={!camera || recording || busy || live}
          onPress={() => {
            snapshot();
          }}
        />
      )}
      {active && mode === 'assessment' && (
        <>
          <Button
            title={recording ? 'Stop recording' : 'Record video'}
            disabled={
              !camera ||
              busy ||
              live ||
              (!camera.startRecording && !camera.recordVideo)
            }
            onPress={() => {
              recording ? finishRecording() : recordVideo();
            }}
          />
          {recording && <AppText>Recording · maximum 30 seconds</AppText>}
          {camera && !camera.startRecording && !camera.recordVideo && (
            <AppText muted>
              Video recording is unavailable on this device.
            </AppText>
          )}
        </>
      )}
      {active && mode === 'assessment' && (
        <>
          <Button
            title={live ? 'Stop live analysis' : 'Start live analysis'}
            disabled={!camera || recording || busy || (!live && !uploadConsent)}
            onPress={() => {
              if (live) {
                stopLive();
              } else {
                startLive();
              }
            }}
          />
          {live && (
            <AppText>
              Live server analysis · approximately 2 samples per second
            </AppText>
          )}
        </>
      )}
      {capture && (
        <>
          <AppText variant="heading">Review capture</AppText>
          <CaptureMediaPreview capture={capture} />
          <Button
            title="Retake"
            onPress={() => {
              generation.current++;
              replaceCapture(null);
              setActive(true);
            }}
          />
        </>
      )}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="Upload consent"
        accessibilityState={{ checked: uploadConsent }}
        onPress={() => {
          if (uploadConsent) {
            generation.current++;
            stopLive();
            setBusy(false);
          }
          setUploadConsent(value => !value);
        }}
      >
        <AppText>
          {uploadConsent ? '☑' : '☐'}{' '}
          {mode === 'hand'
            ? 'I consent to uploading and retaining this hand photo and journal entry.'
            : 'I consent to sending this capture to the server for analysis.'}
        </AppText>
      </Pressable>
      {capture && mode === 'assessment' && (
        <Button
          title="Analyze capture"
          disabled={!uploadConsent || busy}
          onPress={() => {
            analyze();
          }}
        />
      )}
      {capture && mode === 'hand' && (
        <>
          <AppText variant="heading">Hand details</AppText>
          <View style={styles.options}>
            <Button
              title="Left hand"
              variant={side === 'left' ? 'primary' : 'secondary'}
              onPress={() => setSide('left')}
            />
            <Button
              title="Right hand"
              variant={side === 'right' ? 'primary' : 'secondary'}
              onPress={() => setSide('right')}
            />
            <Button
              title="Palm"
              variant={view === 'palm' ? 'primary' : 'secondary'}
              onPress={() => setView('palm')}
            />
            <Button
              title="Back of hand"
              variant={view === 'back' ? 'primary' : 'secondary'}
              onPress={() => setView('back')}
            />
            <AppText>Region: {region}</AppText>
            {[
              'thumb',
              'index_finger',
              'middle_finger',
              'ring_finger',
              'little_finger',
              'palm',
              'back',
              'wrist',
            ].map(value => (
              <Button
                key={value}
                title={
                  value[0].toUpperCase() + value.slice(1).replace(/_/g, ' ')
                }
                variant="secondary"
                onPress={() => setRegion(value)}
              />
            ))}
          </View>
          <AppText>Pain from 0 to 10</AppText>
          <TextInput
            style={styles.input}
            accessibilityLabel="Pain from 0 to 10"
            keyboardType="numeric"
            value={pain}
            onChangeText={setPain}
          />
          {!validPain && (
            <AppText accessibilityRole="alert">
              Enter a whole pain score from 0 to 10.
            </AppText>
          )}
          <AppText>Note</AppText>
          <TextInput
            style={styles.input}
            accessibilityLabel="Hand note"
            maxLength={2000}
            value={note}
            onChangeText={setNote}
            multiline
          />
          <Button
            title="Save hand journal"
            disabled={!uploadConsent || !validPain || busy}
            onPress={() => {
              saveHand();
            }}
          />
        </>
      )}
      {counts && (
        <AppText>
          {counts.valid} / {counts.total} valid samples
        </AppText>
      )}
      {counts && !result && (
        <AppText>
          Quality: No valid measurement. Retake with your body visible in the
          camera.
        </AppText>
      )}
      {result && (
        <>
          <AppText>
            Quality:{' '}
            {result.status === 'ok'
              ? 'Valid sample'
              : result.reason ?? 'Invalid capture'}
          </AppText>
          {result.status === 'ok' && result.value !== null && (
            <>
              <AppText>
                Estimated image-plane angle: {Math.round(result.value)}{' '}
                {result.unit}
              </AppText>
              <AppText muted>
                Camera projection only; not a validated flexibility test.
              </AppText>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Confirm measurement"
                accessibilityState={{ checked: confirmed }}
                onPress={() => setConfirmed(value => !value)}
              >
                <AppText>
                  {confirmed ? '☑' : '☐'} I have reviewed this measurement.
                </AppText>
              </Pressable>
              <Button
                title="Save measurement"
                disabled={!confirmed || busy || live}
                onPress={() => {
                  saveMeasurement();
                }}
              />
            </>
          )}
        </>
      )}
      {!!notice && <AppText accessibilityRole="alert">{notice}</AppText>}
      {!!error && <AppText accessibilityRole="alert">{error}</AppText>}
    </Screen>
  );
}

export function AssessmentScreen() {
  const { goBack } = useNavigation<RouteName>();
  return (
    <>
      <CaptureScreen mode="assessment" />
      <Button title="Back" variant="secondary" onPress={goBack} />
    </>
  );
}
export function HandCaptureScreen() {
  const { goBack } = useNavigation<RouteName>();
  return (
    <>
      <CaptureScreen mode="hand" />
      <Button title="Back" variant="secondary" onPress={goBack} />
    </>
  );
}

const styles = StyleSheet.create({
  accent: { color: '#267044' },
  options: { gap: 8 },
  preview: {
    height: 280,
    backgroundColor: '#12281b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderColor: '#83a891',
    borderRadius: 8,
    padding: 12,
    color: '#12281b',
    backgroundColor: '#f3faf5',
  },
});
