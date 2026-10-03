/**
 * Capability contracts the app depends on. Each host platform provides its own
 * implementation (see capabilities.*.ts); shared code only ever sees these
 * interfaces, so swapping or adding a platform never touches screens or logic.
 */

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

export interface Capabilities {
  readonly platform: PlatformName;
  /** Human-readable description of the OS, for display and diagnostics. */
  readonly platformLabel: string;
  readonly haptics: Haptics;
  readonly storage: KeyValueStore;
}
