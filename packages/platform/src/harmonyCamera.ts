import { toByteArray } from 'base64-js';
import type { MediaCapture } from './camera.types';
export interface HarmonyMediaModule {
  readFrame(uri: string): Promise<string>;
  releaseVideo(uri: string): Promise<void>;
  releaseFrame?(uri: string): Promise<void>;
  recordVideo(
    cameraType: string,
  ): Promise<{ uri: string; filename: string } | null>;
}
export function createHarmonyMediaAdapter(native: HarmonyMediaModule) {
  return {
    releaseFrame: async (uri: string): Promise<void> => {
      await native.releaseFrame?.(uri);
    },
    readBytes: async (uri: string): Promise<Uint8Array> =>
      toByteArray(await native.readFrame(uri)),
    recordVideo: async (
      cameraType: 'front' | 'back',
    ): Promise<MediaCapture | null> => {
      const clip = await native.recordVideo(cameraType);
      if (!clip) {
        return null;
      }
      let released = false;
      return {
        ...clip,
        kind: 'video',
        mimeType: 'video/mp4',
        release: () => {
          if (released) {
            return;
          }
          released = true;
          native.releaseVideo(clip.uri).catch(() => {});
        },
      };
    },
  };
}
