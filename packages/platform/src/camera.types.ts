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

export interface CameraSession {
  snapshot(): Promise<MediaCapture>;
  startRecording?(): Promise<void>;
  stopRecording?(): Promise<MediaCapture>;
  recordVideo?(): Promise<MediaCapture | null>;
}

export type CameraPreviewProps = {
  active: boolean;
  mode: CaptureMode;
  onReady: (session: CameraSession | null) => void;
  onError: (message: string) => void;
};
