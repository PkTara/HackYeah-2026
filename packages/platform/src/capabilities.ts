/**
 * Default implementation, used on Android and iOS.
 *
 * Bundlers pick a platform-specific sibling when one exists:
 *   capabilities.harmony.ts  (Metro, platform "harmony")
 *   capabilities.web.ts      (Vite, see apps/web/vite.config.js)
 */
import { Platform, Vibration } from 'react-native';
import { createMemoryStore } from './memoryStore';
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
};
