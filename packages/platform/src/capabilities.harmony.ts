/**
 * HarmonyOS / OpenHarmony implementation (resolved by Metro for platform "harmony").
 *
 * RNOH implements the core React Native APIs (Platform, Vibration, BackHandler, ...)
 * on top of ArkTS system services. Harmony-only features belong here: expose them
 * from a TurboModule in apps/mobile/harmony and wrap them behind the interfaces in
 * ./types so the rest of the app stays platform-agnostic.
 */
import { Platform, Vibration } from 'react-native';
import { createMemoryStore } from './memoryStore';
import type { Capabilities } from './types';

const { deviceType } = Platform.constants as { deviceType?: string };

export const capabilities: Capabilities = {
  platform: 'harmony',
  // Platform.Version is the OS full name on Harmony, e.g. "OpenHarmony-6.0.0.x".
  platformLabel: [Platform.Version, deviceType].filter(Boolean).join(' · '),
  haptics: {
    isAvailable: true,
    // Requires ohos.permission.VIBRATE (declared in harmony/entry/src/main/module.json5).
    tap: () => Vibration.vibrate(10),
  },
  // TODO: swap for persistent storage (e.g. @react-native-ohos/async-storage).
  storage: createMemoryStore(),
};
