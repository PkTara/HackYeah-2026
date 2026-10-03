/** Browser implementation (resolved by Vite via the ".web.ts" extension). */
import { createMemoryStore } from './memoryStore';
import type { Capabilities, KeyValueStore } from './types';

// Typed locally so shared code doesn't need the DOM lib in its tsconfig.
type BrowserGlobals = {
  navigator?: { userAgent?: string; vibrate?: (pattern: number) => boolean };
  localStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
};

const browser = globalThis as BrowserGlobals;

/**
 * localStorage can be missing or throw (private windows, blocked site data,
 * sandboxed frames). Any failure falls back to memory for that call, so the
 * app keeps working and just forgets on reload.
 */
function createLocalStorageStore(): KeyValueStore {
  let storage: BrowserGlobals['localStorage'];
  try {
    storage = browser.localStorage;
  } catch {
    storage = undefined;
  }
  const fallback = createMemoryStore();
  if (!storage) {
    return fallback;
  }
  const local = storage;
  return {
    async getItem(key) {
      try {
        return local.getItem(key);
      } catch {
        return fallback.getItem(key);
      }
    },
    async setItem(key, value) {
      try {
        local.setItem(key, value);
      } catch {
        await fallback.setItem(key, value);
      }
    },
    async removeItem(key) {
      try {
        local.removeItem(key);
      } catch {
        await fallback.removeItem(key);
      }
    },
  };
}

export const capabilities: Capabilities = {
  platform: 'web',
  platformLabel: 'Web browser',
  haptics: {
    isAvailable: typeof browser.navigator?.vibrate === 'function',
    tap: () => {
      browser.navigator?.vibrate?.(10);
    },
  },
  storage: createLocalStorageStore(),
};
