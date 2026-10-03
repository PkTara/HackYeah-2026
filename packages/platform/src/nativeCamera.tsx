import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { CameraPreviewProps, MediaCapture } from './camera.types';

export type NativeCapture = {
  uri: string;
  name?: string;
  path?: string;
  width?: number;
  height?: number;
};
export type NativeCameraHandle = { capture(): Promise<NativeCapture> };
export type NativeCameraViewProps = {
  cameraType: 'front' | 'back';
  onStarted?: () => void;
  style?: object;
  onError?: (event: {
    nativeEvent: { errorMessage?: string; message?: string };
  }) => void;
};
export type NativeCameraDriver = {
  View: React.ComponentType<
    NativeCameraViewProps & React.RefAttributes<NativeCameraHandle>
  >;
  requiresStarted?: boolean;
  requestPermission(): Promise<boolean>;
  readBytes?(uri: string): Promise<Uint8Array>;
  releaseFrame?(uri: string): Promise<void>;
  recordVideo?(cameraType: 'front' | 'back'): Promise<MediaCapture | null>;
};
const previewStyle = { flex: 1 };

export function createNativeCameraPreview(driver: NativeCameraDriver) {
  return function NativeCameraPreview(props: CameraPreviewProps) {
    const [allowed, setAllowed] = useState(false);
    const [started, setStarted] = useState(false);
    const [picking, setPicking] = useState(false);
    const recordingBusy = useRef(false);
    const pendingPicker = useRef<{
      cameraType: 'front' | 'back';
      resolve: (capture: MediaCapture | null) => void;
      reject: (reason: unknown) => void;
    } | null>(null);
    const camera = useRef<NativeCameraHandle | null>(null);
    const [mounted, setMounted] = useState(false);
    const bindCamera = useCallback((value: NativeCameraHandle | null) => {
      camera.current = value;
      setMounted(Boolean(value));
    }, []);
    const callbacks = useRef(props);
    callbacks.current = props;
    useEffect(() => {
      let current = true;
      setAllowed(false);
      setStarted(false);
      if (props.active) {
        driver
          .requestPermission()
          .then(granted => {
            if (current) {
              setAllowed(granted);
              if (!granted) {
                callbacks.current.onError(
                  'Camera permission is required to show the live preview.',
                );
              }
            }
          })
          .catch(error => {
            if (current) {
              callbacks.current.onError(
                error instanceof Error
                  ? error.message
                  : 'Camera permission request failed.',
              );
            }
          });
      }
      return () => {
        current = false;
      };
    }, [props.active]);
    useEffect(() => {
      if (!picking || !pendingPicker.current || !driver.recordVideo) {
        return;
      }
      const pending = pendingPicker.current;
      pendingPicker.current = null;
      let current = true;
      driver
        .recordVideo(pending.cameraType)
        .then(capture => {
          if (!current || !callbacks.current.active) {
            capture?.release?.();
            pending.resolve(null);
          } else {
            pending.resolve(capture);
          }
        }, pending.reject)
        .finally(() => {
          recordingBusy.current = false;
          setPicking(false);
        });
      return () => {
        current = false;
      };
    }, [picking]);
    useEffect(() => {
      let current = true;
      if (
        props.active &&
        allowed &&
        !picking &&
        camera.current &&
        (!driver.requiresStarted || started)
      ) {
        callbacks.current.onReady({
          ...(driver.recordVideo
            ? {
                recordVideo: () => {
                  if (!current || !callbacks.current.active || picking) {
                    return Promise.reject(
                      new Error('Camera preview is inactive.'),
                    );
                  }
                  if (recordingBusy.current) {
                    return Promise.reject(
                      new Error('Video recording is already open.'),
                    );
                  }
                  recordingBusy.current = true;
                  setStarted(false);
                  return new Promise<MediaCapture | null>((resolve, reject) => {
                    pendingPicker.current = {
                      cameraType:
                        callbacks.current.mode === 'hand' ? 'front' : 'back',
                      resolve,
                      reject,
                    };
                    setPicking(true);
                  });
                },
              }
            : {}),
          snapshot: async () => {
            if (!current || !callbacks.current.active || !camera.current) {
              throw new Error('Camera preview is inactive.');
            }
            const frame = await camera.current.capture();
            if (!frame || !frame.uri) {
              throw new Error(
                'Camera is still starting. Try again in a moment.',
              );
            }
            const uri = frame.path
              ? frame.path.includes('://')
                ? frame.path
                : `file://${frame.path}`
              : frame.uri;
            let released = false;
            const release = driver.releaseFrame
              ? () => {
                  if (released) {
                    return;
                  }
                  released = true;
                  driver.releaseFrame!(uri).catch(() => {});
                }
              : undefined;
            try {
              if (!current || !callbacks.current.active) {
                throw new Error('Camera preview is inactive.');
              }
              const bytes = driver.readBytes
                ? await driver.readBytes(uri)
                : undefined;
              if (!current || !callbacks.current.active) {
                throw new Error('Camera preview is inactive.');
              }
              return {
                ...(release ? { release } : {}),
                kind: 'image',
                ...(bytes ? { bytes } : {}),
                uri,
                mimeType: 'image/jpeg',
                filename: frame.name || 'frame.jpg',
                width: frame.width,
                height: frame.height,
              };
            } catch (error) {
              release?.();
              throw error;
            }
          },
        });
      }
      return () => {
        current = false;
        callbacks.current.onReady(null);
      };
    }, [props.active, allowed, mounted, picking, started]);
    return props.active && allowed && !picking ? (
      <driver.View
        ref={bindCamera}
        onStarted={() => setStarted(true)}
        onError={event => {
          setAllowed(false);
          callbacks.current.onError(
            event.nativeEvent.errorMessage ||
              event.nativeEvent.message ||
              'Camera could not start.',
          );
        }}
        cameraType={props.mode === 'hand' ? 'front' : 'back'}
        style={previewStyle}
      />
    ) : (
      <View />
    );
  };
}
