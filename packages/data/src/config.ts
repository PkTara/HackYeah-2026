import type { KeyValueStore } from '@hackyeah/platform';
import type { ClimbingBackend } from './backend';
import { createHttpBackend } from './http';
import { createLocalBackend } from './local';
import { createMediaClient, type MediaClient } from './media';

/**
 * The API the native app saves to, e.g. "http://192.168.1.20:8000" (the
 * FastAPI server in backend/). null keeps everything on the device, starting
 * from the sample climbs. The web host passes VITE_MONKEY_API_URL instead.
 * The same address is used for the camera (createMedia).
 */
export const API_BASE_URL: string | null = null;

export type BackendConfig = Readonly<{
  /** Server root. Left out or null: API_BASE_URL. Empty: on the device. */
  apiBaseUrl?: string | null;
}>;

/** The HTTP backend when an API URL is set, otherwise the on-device one. */
export function createBackend(
  storage: KeyValueStore,
  config: BackendConfig = {},
): ClimbingBackend {
  const baseUrl = (config.apiBaseUrl ?? API_BASE_URL)?.trim();
  return baseUrl
    ? createHttpBackend({ baseUrl, storage })
    : createLocalBackend(storage);
}

/**
 * The camera's media client for the same server, or null without one: the
 * on-device demo has nowhere to analyse or keep photos, and the camera
 * screens say so.
 */
export function createMedia(
  storage: KeyValueStore,
  config: BackendConfig = {},
): MediaClient | null {
  const baseUrl = (config.apiBaseUrl ?? API_BASE_URL)?.trim();
  return baseUrl ? createMediaClient({ baseUrl, storage }) : null;
}
