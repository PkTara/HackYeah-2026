export type CaptureMode = 'assessment' | 'hand';

export type MediaCapture = {
  kind: 'image' | 'video';
  uri: string;
  mimeType: string;
  filename: string;
  width?: number;
  height?: number;
  blob?: Blob;
  bytes?: Uint8Array;
  release?: () => void;
};

/**
 * A running camera. Snapshots work everywhere; the web can also record a
 * clip. Android and iOS do not record yet, so those methods are missing.
 */
export interface CameraSession {
  snapshot(): Promise<MediaCapture>;
  startRecording?(): Promise<void>;
  stopRecording?(): Promise<MediaCapture>;
}

export type CameraPreviewProps = {
  active: boolean;
  mode: CaptureMode;
  onReady: (session: CameraSession | null) => void;
  onError: (message: string) => void;
};
