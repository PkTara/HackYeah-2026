/**
 * Native implementation, used on Android and iOS (bundled by Metro).
 *
 * The web build uses capabilities.web.ts instead: Vite prefers ".web.ts" files
 * (see apps/web/vite.config.js). If Android and iOS ever need different code,
 * add capabilities.android.ts or capabilities.ios.ts; Metro picks those first.
 */
import { Platform, Vibration } from 'react-native';
import { CameraPreview } from './camera';
import { CaptureMediaPreview } from './capturePreview';
import { createMemoryStore } from './memoryStore';
import { platformShare } from './share';
import type { Capabilities } from './types';

export const capabilities: Capabilities = {
  platform:
    Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : 'other',
  platformLabel: `${Platform.OS} ${Platform.Version}`,
  haptics: {
    isAvailable: true,
    tap: () => Vibration.vibrate(10),
  },
  // TODO: swap for persistent storage (e.g. @react-native-async-storage/async-storage).
  storage: createMemoryStore(),
  camera: { Preview: CameraPreview, MediaPreview: CaptureMediaPreview },
  // No music yet: playing audio on Android and iOS needs a native audio
  // library behind the same MusicCapability. The music button stays hidden.
  music: undefined,
  // No sound effects either, for the same reason: the app stays silent and
  // hides the sound effects switch.
  sfx: undefined,
  // React Native's built-in Share sheet. No native library needed.
  share: platformShare,
};
