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

/**
 * Background music: an original loop, made in code (see music/song.ts).
 * Browsers only allow sound after the person taps, clicks or presses a key,
 * so play() must run inside such a gesture, or from onNextGesture.
 */
export interface MusicCapability {
  /** True from play() until stop(), also while the page is hidden. */
  readonly playing: boolean;
  /** Starts the loop from the top, fading in. Does nothing if playing. */
  play(): Promise<void>;
  /** Fades out and stops. */
  stop(): void;
  /**
   * Calls `listener` once, on the next tap, click or key press anywhere.
   * Used to resume music that was left on, without autoplaying. Returns a
   * function that cancels the wait.
   */
  onNextGesture(listener: () => void): () => void;
}

/** The short sound effects, made in code with ZzFX (see sfx/effects.ts). */
export type SfxName = 'typing' | 'tap' | 'select' | 'success' | 'levelUp';

/**
 * Quiet sound effects for taps, typing and rewards. On by default; the
 * person can turn them off (the app saves that choice, not this object).
 *
 * play() never throws and never makes sound before the person has tapped,
 * clicked or pressed a key on the page (browsers block it), while turned
 * off, or while the page is hidden. Those calls are dropped, not queued.
 */
export interface SfxCapability {
  /**
   * Plays one effect. `variant` picks a small fixed pitch step, so the
   * typing murmur can follow the letters and still sound the same every
   * time (no randomness). Other effects ignore it.
   */
  play(name: SfxName, variant?: number): void;
  /** False after setEnabled(false). */
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
}

export interface Capabilities {
  readonly platform: PlatformName;
  /** Human-readable description of the OS, for display and diagnostics. */
  readonly platformLabel: string;
  readonly haptics: Haptics;
  readonly storage: KeyValueStore;
  /** Missing where there is no camera; the camera screens say so. */
  readonly camera?: CameraCapability;
  /**
   * Missing where there is no music player yet (Android and iOS need a
   * native audio library); the music button is then hidden.
   */
  readonly music?: MusicCapability;
  /**
   * Missing where there is no sound effect player yet (Android and iOS
   * need a native audio library); the app is then silent and the switch
   * is hidden.
   */
  readonly sfx?: SfxCapability;
}
