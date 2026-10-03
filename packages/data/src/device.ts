/**
 * What the HTTP backend keeps on the device instead of the server, in the
 * platform key-value store:
 * - the API token of this device's anonymous server profile
 * - the setup answers, the "skipped setup" marker and the latest home test
 *   results. The server has no place for most of them (places, experience,
 *   connections, four of the six tests), and the anonymous profile belongs to
 *   this device anyway.
 */
import {
  parseBaselineResults,
  parseOnboardingResult,
  type BaselineResult,
  type OnboardingResult,
} from '@hackyeah/core';
import type { KeyValueStore } from '@hackyeah/platform';

/** The bearer token. Losing it loses access to the server profile. */
export const API_TOKEN_KEY = 'climbing-monkey/api-token/v1';
export const DEVICE_STORAGE_KEY = 'climbing-monkey/device/v1';

export type DeviceData = Readonly<{
  onboarding: OnboardingResult | null;
  onboardingSkipped: boolean;
  /** Latest result per home test, in test order (see core's mergeBaseline). */
  baseline: readonly BaselineResult[];
}>;

export const emptyDeviceData: DeviceData = {
  onboarding: null,
  onboardingSkipped: false,
  baseline: [],
};

/** Saved JSON to DeviceData. Anything unreadable starts over as empty. */
export function parseDeviceData(json: string | null): DeviceData {
  try {
    const value = json ? JSON.parse(json) : null;
    return {
      onboarding: parseOnboardingResult(value?.onboarding),
      onboardingSkipped: value?.onboardingSkipped === true,
      baseline: parseBaselineResults(value?.baseline),
    };
  } catch {
    return emptyDeviceData;
  }
}

export function createDeviceStore(storage: KeyValueStore) {
  async function read(): Promise<DeviceData> {
    return parseDeviceData(await storage.getItem(DEVICE_STORAGE_KEY));
  }
  /** Read, change, save. Callers run updates one at a time. */
  async function update(change: (old: DeviceData) => DeviceData) {
    const next = change(await read());
    await storage.setItem(
      DEVICE_STORAGE_KEY,
      JSON.stringify({ version: 1, ...next }),
    );
  }
  /** Forgets this device's server profile: its token and the device-only data. */
  async function forget() {
    await storage.removeItem(API_TOKEN_KEY);
    await storage.removeItem(DEVICE_STORAGE_KEY);
  }
  return { read, update, forget };
}
