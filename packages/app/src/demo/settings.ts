import { CONNECTION_IDS, type ConnectionId } from '@hackyeah/core';
import type { KeyValueStore } from '@hackyeah/platform';

export const DEMO_SETTINGS_KEY = 'climbing-monkey/demo-settings/v1';
export const DEMO_SCENARIO_KEY = 'climbing-monkey/demo-scenario/v1';
const PREFIX = 'climbing-monkey/demo/v1/';
export type DemoSettings = Readonly<{
  enabled: boolean;
  profile: boolean;
  camera: boolean;
  analysis: boolean;
  handPhotos: boolean;
  testResults: boolean;
  previews: boolean;
  connections: Readonly<Record<ConnectionId, boolean>>;
}>;
export const demoDefaults: DemoSettings = {
  enabled: false,
  profile: true,
  camera: true,
  analysis: true,
  handPhotos: true,
  testResults: true,
  previews: true,
  connections: Object.fromEntries(
    CONNECTION_IDS.map(id => [id, true]),
  ) as Record<ConnectionId, boolean>,
};

export function parseDemoSettings(json: string | null): DemoSettings {
  try {
    const value = JSON.parse(json ?? 'null');
    if (!value || typeof value !== 'object') {
      return demoDefaults;
    }
    const boolean = (key: keyof Omit<DemoSettings, 'connections'>) =>
      typeof value[key] === 'boolean' ? value[key] : demoDefaults[key];
    return {
      enabled: boolean('enabled'),
      profile: boolean('profile'),
      camera: boolean('camera'),
      analysis: boolean('analysis'),
      handPhotos: boolean('handPhotos'),
      testResults: boolean('testResults'),
      previews: boolean('previews'),
      connections: Object.fromEntries(
        CONNECTION_IDS.map(id => [
          id,
          typeof value.connections?.[id] === 'boolean'
            ? value.connections[id]
            : true,
        ]),
      ) as Record<ConnectionId, boolean>,
    };
  } catch {
    return demoDefaults;
  }
}

/** Every demo adapter, including a real API used in demo mode, gets this store. */
export function demoStorage(storage: KeyValueStore, scope = ''): KeyValueStore {
  return scopedStorage(storage, PREFIX + scope);
}

export function scopedStorage(
  storage: KeyValueStore,
  prefix: string,
): KeyValueStore {
  return {
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
  };
}
