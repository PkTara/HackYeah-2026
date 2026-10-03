import type { KeyValueStore } from '@hackyeah/platform';
import type { ClimbingBackend } from './backend';
import { createHttpBackend } from './http';
import { createLocalBackend } from './local';

/**
 * Where the app gets its data.
 *
 * null: everything stays on the device, starting from the sample climbs.
 * A URL: the app loads and saves through that API (see endpoints.ts).
 */
export const API_BASE_URL: string | null = null;

export function createBackend(storage: KeyValueStore): ClimbingBackend {
  return API_BASE_URL
    ? createHttpBackend({ baseUrl: API_BASE_URL })
    : createLocalBackend(storage);
}
