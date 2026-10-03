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

function createLocalStorageStore(): KeyValueStore {
  const storage = browser.localStorage;
  if (!storage) {
    return createMemoryStore();
  }
  return {
    async getItem(key) {
      return storage.getItem(key);
    },
    async setItem(key, value) {
      storage.setItem(key, value);
    },
    async removeItem(key) {
      storage.removeItem(key);
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
