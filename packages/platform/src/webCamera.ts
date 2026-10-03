import type { CameraSession, CaptureMode, MediaCapture } from './camera.types';

export type CameraStream = { getTracks(): { stop(): void }[] };
export type VideoSurface = {
  srcObject: CameraStream | null;
  videoWidth: number;
  videoHeight: number;
  play(): Promise<void>;
};
export type CanvasSurface = {
  width: number;
  height: number;
  getContext(
    kind: '2d',
  ): { drawImage(video: VideoSurface, x: number, y: number): void } | null;
  toBlob(
    callback: (blob: Blob | null) => void,
    type: string,
    quality: number,
  ): void;
};
export type RecorderSurface = {
  state: string;
  mimeType: string;
  start(): void;
  stop(): void;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
};
export type CameraEnvironment = {
  getUserMedia(options: object): Promise<CameraStream>;
  createCanvas(): CanvasSurface;
  createUrl(blob: Blob): string;
  revokeUrl(uri: string): void;
  createRecorder?(stream: CameraStream): RecorderSurface;
};

export function createWebCamera(environment: CameraEnvironment) {
  let recording: {
    recorder: RecorderSurface;
    result: Promise<MediaCapture>;
    cancel(): void;
  } | null = null;
  let generation = 0;
  let stream: CameraStream | null = null;
  let surface: VideoSurface | null = null;
  const stop = () => {
    generation += 1;
    if (recording) {
      const active = recording;
      recording = null;
      active.recorder.ondataavailable = null;
      active.recorder.onstop = null;
      active.recorder.onerror = null;
      active.cancel();
      if (active.recorder.state !== 'inactive') {
        active.recorder.stop();
      }
    }
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    if (surface) {
      surface.srcObject = null;
    }
    surface = null;
  };
  return {
    async start(
      video: VideoSurface,
      mode: CaptureMode,
    ): Promise<CameraSession> {
      stop();
      const request = generation;
      const granted = await environment.getUserMedia({
        audio: false,
        video: {
          facingMode: mode === 'hand' ? 'environment' : 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
      });
      if (request !== generation) {
        granted.getTracks().forEach(track => track.stop());
        throw new Error('Camera was closed');
      }
      stream = granted;
      surface = video;
      video.srcObject = stream;
      try {
        await video.play();
      } catch (error) {
        if (request === generation) {
          stop();
        }
        throw error;
      }
      if (request !== generation) {
        throw new Error('Camera was closed');
      }
      const session: CameraSession = {
        snapshot: () =>
          new Promise((resolve, reject) => {
            if (request !== generation) {
              reject(new Error('Camera is closed'));
              return;
            }
            if (!video.videoWidth || !video.videoHeight) {
              reject(new Error('Camera frame is not ready'));
              return;
            }
            const canvas = environment.createCanvas();
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (!context) {
              reject(new Error('Snapshot is unavailable'));
              return;
            }
            context.drawImage(video, 0, 0);
            canvas.toBlob(
              blob => {
                if (!blob) {
                  reject(new Error('Snapshot could not be captured'));
                  return;
                }
                const uri = environment.createUrl(blob);
                resolve({
                  kind: 'image',
                  uri,
                  blob,
                  mimeType: 'image/jpeg',
                  filename: 'snapshot.jpg',
                  width: canvas.width,
                  height: canvas.height,
                  release: () => environment.revokeUrl(uri),
                });
              },
              'image/jpeg',
              0.8,
            );
          }),
      };
      if (environment.createRecorder) {
        session.startRecording = async () => {
          if (recording) {
            throw new Error('Already recording');
          }
          const recorder = environment.createRecorder!(granted);
          const chunks: Blob[] = [];
          let cancel = () => {};
          const result = new Promise<MediaCapture>((resolve, reject) => {
            cancel = () => reject(new Error('Recording was cancelled'));
            recorder.ondataavailable = event => {
              if (event.data.size) {
                chunks.push(event.data);
              }
            };
            recorder.onerror = () => {
              recorder.onstop = null;
              recorder.ondataavailable = null;
              recorder.onerror = null;
              recording = null;
              reject(new Error('Video recording failed'));
            };
            recorder.onstop = () => {
              const blob = new Blob(chunks, {
                type: recorder.mimeType || 'video/webm',
                lastModified: Date.now(),
              });
              if (!blob.size) {
                recording = null;
                reject(new Error('No video frames were recorded'));
                return;
              }
              const uri = environment.createUrl(blob);
              resolve({
                kind: 'video',
                uri,
                blob,
                mimeType: blob.type,
                filename: 'capture.webm',
                release: () => environment.revokeUrl(uri),
              });
            };
          });
          result.catch(() => {});
          recording = { recorder, result, cancel };
          recorder.start();
        };
        session.stopRecording = async () => {
          if (!recording) {
            throw new Error('No active recording');
          }
          const active = recording;
          if (active.recorder.state !== 'inactive') {
            active.recorder.stop();
          }
          const capture = await active.result;
          recording = null;
          return capture;
        };
      }
      return session;
    },
    stop,
  };
}
