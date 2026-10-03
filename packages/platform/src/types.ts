/**
 * Capability contracts the app depends on. Each host platform provides its own
 * implementation (see capabilities.*.ts); shared code only ever sees these
 * interfaces, so swapping or adding a platform never touches screens or logic.
 */
import type { ComponentType } from 'react';
import type { CameraPreviewProps, MediaCapture } from './camera.types';

export type PlatformName = 'android' | 'ios' | 'web' | 'other';

export interface Haptics {
  readonly isAvailable: boolean;
  tap(): void;
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * The camera, as two components: camera.tsx (Android, iOS, through
 * react-native-camera-kit) and camera.web.tsx (getUserMedia).
 */
export interface CameraCapability {
  /** Live preview. Offers a CameraSession through onReady while active. */
  Preview: ComponentType<CameraPreviewProps>;
  /** Shows a reviewed photo or clip before anything is sent. */
  MediaPreview: ComponentType<{ capture: MediaCapture }>;
}

export interface Capabilities {
  readonly platform: PlatformName;
  /** Human-readable description of the OS, for display and diagnostics. */
  readonly platformLabel: string;
  readonly haptics: Haptics;
  readonly storage: KeyValueStore;
  /** Missing where there is no camera; the camera screens say so. */
  readonly camera?: CameraCapability;
}
