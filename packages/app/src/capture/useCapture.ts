import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LiveHandlers, LiveSession, MediaClient } from '@hackyeah/data';
import type {
  CameraSession,
  CaptureMode,
  MediaCapture,
} from '@hackyeah/platform';

/** Browser clips stop by themselves after this long. */
export const MAX_CLIP_MS = 30_000;

const message = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * The camera on a capture screen: the live preview, one reviewed photo or
 * clip, recording and live analysis. Nothing here sends anything; screens
 * pass media calls through run().
 *
 * Every async step remembers which "generation" it started in. Stopping the
 * camera, retaking, leaving the screen or the app going to the background
 * starts a new one, so a late answer from an old step is dropped (and a
 * late photo or clip released) instead of showing up on the wrong capture.
 */
export function useCapture(mode: CaptureMode) {
  /** The preview is on. Photos and clips switch it off for review. */
  const [active, setActive] = useState(false);
  /** The running camera, once the preview offers one. */
  const [camera, setCamera] = useState<CameraSession | null>(null);
  /** The photo or clip under review. Stays on the device. */
  const [capture, setCaptureState] = useState<MediaCapture | null>(null);
  const [recording, setRecording] = useState(false);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const held = useRef<MediaCapture | null>(null);
  const recordingSession = useRef<CameraSession | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveSession = useRef<LiveSession | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);

  /** Swaps the reviewed capture, releasing the old one's file or URL. */
  const keep = useCallback((next: MediaCapture | null) => {
    if (held.current !== next) {
      held.current?.release?.();
    }
    held.current = next;
    setCaptureState(next);
  }, []);

  const stopLive = useCallback(() => {
    liveSession.current?.stop();
    liveSession.current = null;
    setLive(false);
  }, []);

  /** Ends everything in flight and frees what it holds. */
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
    session
      ?.stopRecording?.()
      .then(clip => clip.release?.())
      .catch(() => {});
    held.current?.release?.();
    held.current = null;
  }, []);

  const stop = useCallback(() => {
    dispose();
    setActive(false);
    setCamera(null);
    setCaptureState(null);
    setRecording(false);
    setLive(false);
    setBusy(false);
  }, [dispose]);

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'inactive') {
        // A permission dialog makes the app inactive for a moment: keep the
        // preview starting, but send nothing while the climber is away.
        liveSession.current?.stop();
        liveSession.current = null;
        setLive(false);
      } else if (state === 'background') {
        stop();
      }
    });
    return () => {
      mounted.current = false;
      dispose();
      subscription?.remove();
    };
  }, [dispose, stop]);

  const start = () => {
    generation.current++;
    keep(null);
    setError('');
    setActive(true);
  };

  const retake = () => {
    generation.current++;
    keep(null);
    setError('');
    setActive(true);
  };

  /**
   * Runs a step that may answer late: busy while it runs, its error shown,
   * and its answer dropped if the camera moved on meanwhile.
   */
  const run = async <T>(
    task: () => Promise<T>,
    done: (value: T) => void,
    fallback = 'That did not work. Try again.',
  ) => {
    const step = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const value = await task();
      if (step === generation.current && mounted.current) {
        done(value);
      }
    } catch (failure) {
      if (step === generation.current && mounted.current) {
        setError(message(failure, fallback));
      }
    } finally {
      if (step === generation.current && mounted.current) {
        setBusy(false);
      }
    }
  };

  /** Stops sending and drops anything still on its way. */
  const cancel = () => {
    generation.current++;
    stopLive();
    setBusy(false);
  };

  const snapshot = async () => {
    if (!camera || live || busy || recording) {
      return;
    }
    const step = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const photo = await camera.snapshot();
      if (step !== generation.current) {
        photo.release?.();
        return;
      }
      keep(photo);
      setActive(false);
    } catch (failure) {
      if (step === generation.current) {
        setError(message(failure, 'The photo did not work. Try again.'));
      }
    } finally {
      if (step === generation.current) {
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
    const step = generation.current;
    try {
      const clip = await session.stopRecording();
      if (step !== generation.current) {
        clip.release?.();
        return;
      }
      keep(clip);
      setRecording(false);
      setActive(false);
    } catch (failure) {
      if (step === generation.current) {
        setRecording(false);
        setError(message(failure, 'Recording failed. Try again.'));
      }
    }
  };

  const startRecording = async () => {
    if (!camera?.startRecording || !camera.stopRecording) {
      return;
    }
    if (busy || recording || live) {
      return;
    }
    const step = ++generation.current;
    setError('');
    setRecording(true);
    recordingSession.current = camera;
    try {
      await camera.startRecording();
      if (step !== generation.current) {
        camera
          .stopRecording()
          .then(clip => clip.release?.())
          .catch(() => {});
        return;
      }
      recordingTimer.current = setTimeout(() => {
        finishRecording();
      }, MAX_CLIP_MS);
    } catch (failure) {
      if (step === generation.current) {
        recordingSession.current = null;
        setRecording(false);
        setError(message(failure, 'Recording failed. Try again.'));
      }
    }
  };

  /** Live analysis of the preview through the server, after consent. */
  const startLive = async (
    media: MediaClient,
    consent: boolean,
    onResult: LiveHandlers['onResult'],
  ) => {
    if (!camera || liveSession.current || busy || recording) {
      return;
    }
    const step = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const session = await media.startLive(camera, consent, {
        onResult: result => {
          if (step === generation.current) {
            onResult(result);
          }
        },
        onError: text => {
          if (step === generation.current) {
            setError(text);
          }
        },
        onStopped: () => {
          if (step === generation.current) {
            liveSession.current = null;
            setLive(false);
          }
        },
      });
      if (step !== generation.current) {
        session.stop();
        return;
      }
      liveSession.current = session;
      setLive(true);
    } catch (failure) {
      if (step === generation.current) {
        setError(message(failure, 'Live analysis did not start.'));
      }
    } finally {
      if (step === generation.current) {
        setBusy(false);
      }
    }
  };

  // For the preview component; stable so it does not restart the camera.
  const onReady = useCallback((session: CameraSession | null) => {
    if (mounted.current) {
      setCamera(session);
    }
  }, []);
  const onError = useCallback((text: string) => {
    if (mounted.current) {
      setError(text);
      setActive(false);
      setCamera(null);
    }
  }, []);

  return {
    mode,
    active,
    camera,
    capture,
    recording,
    live,
    busy,
    error,
    /** Recording is offered only where the camera can record (the web). */
    canRecord: Boolean(camera?.startRecording && camera.stopRecording),
    start,
    stop,
    retake,
    snapshot,
    startRecording,
    finishRecording,
    startLive,
    stopLive,
    cancel,
    run,
    setError,
    onReady,
    onError,
  };
}

export type Capture = ReturnType<typeof useCapture>;
