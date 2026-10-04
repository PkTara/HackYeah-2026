import { createElement, useEffect, useRef } from 'react';
import type { CameraPreviewProps } from './camera.types';
import {
  createWebCamera,
  type CameraEnvironment,
  type VideoSurface,
  type CanvasSurface,
  type RecorderSurface,
} from './webCamera';

type BrowserCamera = {
  navigator?: {
    mediaDevices?: { getUserMedia: CameraEnvironment['getUserMedia'] };
  };
  document?: { createElement(tag: 'canvas'): CanvasSurface };
  URL: {
    createObjectURL(blob: Blob): string;
    revokeObjectURL(uri: string): void;
  };
  MediaRecorder?: {
    new (stream: unknown, options?: { mimeType: string }): RecorderSurface;
    isTypeSupported(type: string): boolean;
  };
};

export function CameraPreview({
  active,
  mode,
  onReady,
  onError,
  onGeometry,
}: CameraPreviewProps) {
  const video = useRef<VideoSurface | null>(null);
  const geometryCallback = useRef(onGeometry);
  geometryCallback.current = onGeometry;
  const reportGeometry = () => {
    if (video.current?.videoWidth && video.current.videoHeight) {
      geometryCallback.current?.({
        imageWidth: video.current.videoWidth,
        imageHeight: video.current.videoHeight,
        mirrored: false,
        fit: 'contain',
      });
    }
  };
  useEffect(() => {
    if (!active) {
      return;
    }
    const browser = globalThis as unknown as BrowserCamera;
    const media = browser.navigator?.mediaDevices;
    if (!media || !video.current) {
      onError(
        'Camera is unavailable. Use HTTPS or localhost and allow camera access.',
      );
      return;
    }
    const environment: CameraEnvironment = {
      getUserMedia: options => media.getUserMedia(options),
      createCanvas: () => browser.document!.createElement('canvas'),
      createUrl: blob => browser.URL.createObjectURL(blob),
      revokeUrl: uri => browser.URL.revokeObjectURL(uri),
    };
    const Recorder = browser.MediaRecorder;
    if (Recorder) {
      environment.createRecorder = stream => {
        const type = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(
          candidate => Recorder.isTypeSupported(candidate),
        );
        return new Recorder(stream, type ? { mimeType: type } : undefined);
      };
    }
    const camera = createWebCamera(environment);
    let closed = false;
    camera
      .start(video.current, mode)
      .then(session => {
        if (!closed) {
          reportGeometry();
          onReady(session);
        }
      })
      .catch(error => {
        if (!closed) {
          onError(
            error instanceof Error
              ? error.message
              : 'Camera permission was denied.',
          );
        }
      });
    return () => {
      closed = true;
      camera.stop();
      onReady(null);
    };
  }, [active, mode, onReady, onError]);
  if (!active) {
    return null;
  }
  return createElement('video', {
    ref: video,
    autoPlay: true,
    onLoadedMetadata: reportGeometry,
    muted: true,
    playsInline: true,
    'aria-label': 'Live camera preview',
    style: {
      width: '100%',
      height: 280,
      objectFit: 'contain',
      backgroundColor: '#12281b',
    },
  });
}
