import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LOCAL_STORAGE_KEY } from '@hackyeah/data';
import type { KeyValueStore } from '@hackyeah/platform';
import { AppText } from '@hackyeah/ui';
import {
  DEMO_SETTINGS_KEY,
  DEMO_SCENARIO_KEY,
  demoDefaults,
  demoStorage,
  parseDemoSettings,
  type DemoSettings,
} from './settings';

type DemoApi = {
  settings: DemoSettings;
  update: (change: Partial<DemoSettings>) => void;
  open: (parent?: string) => void;
  parent: string;
  close: () => void;
  visible: boolean;
  storage: KeyValueStore | null;
  revision: number;
  reset: () => Promise<void>;
  error: string;
};
const DemoContext = createContext<DemoApi>({
  settings: demoDefaults,
  update: () => {},
  open: () => {},
  close: () => {},
  visible: false,
  parent: 'Data',
  storage: null,
  revision: 0,
  reset: async () => {},
  error: '',
});
export const useDemo = () => useContext(DemoContext);

export function DemoProvider({
  storage,
  children,
}: {
  storage: KeyValueStore;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(demoDefaults);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [parent, setParent] = useState('Data');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const scoped = useMemo(
    () => demoStorage(storage, revision ? `scenario/${revision}/` : ''),
    [storage, revision],
  );
  const queue = useRef(Promise.resolve());
  const resetting = useRef(false);
  useEffect(() => {
    let mounted = true;
    Promise.all([
      storage.getItem(DEMO_SETTINGS_KEY),
      storage.getItem(DEMO_SCENARIO_KEY),
    ]).then(
      ([json, scenario]) => {
        if (mounted) {
          const savedRevision = Number(scenario);
          setRevision(
            Number.isSafeInteger(savedRevision) && savedRevision >= 0
              ? savedRevision
              : 0,
          );
          setSettings(parseDemoSettings(json));
          setReady(true);
        }
      },
      () => {
        if (mounted) {
          setReady(true);
          setError('Could not load demo settings.');
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, [storage]);
  // Effects queue writes, so rapidly unticking boxes cannot persist an old choice.
  useEffect(() => {
    if (!ready) {
      return;
    }
    queue.current = queue.current
      .then(() => storage.setItem(DEMO_SETTINGS_KEY, JSON.stringify(settings)))
      .then(
        () => setError(''),
        () =>
          setError(
            'Could not save demo settings. Your choices apply until this app closes.',
          ),
      );
  }, [ready, settings, storage]);
  const api: DemoApi = {
    settings,
    update: change => setSettings(old => ({ ...old, ...change })),
    visible,
    parent,
    open: (from = 'Data') => {
      setParent(from);
      setVisible(true);
    },
    close: () => setVisible(false),
    storage: scoped,
    revision,
    error,
    reset: async () => {
      if (resetting.current) {
        return;
      }
      resetting.current = true;
      try {
        await scoped.removeItem(LOCAL_STORAGE_KEY);
        await scoped.removeItem('media/assessments');
        await scoped.removeItem('media/hands');
        // A new namespace also retires the old API identity. Late saves still
        // hold the old store and cannot repopulate this presentation scenario.
        const next = revision + 1;
        await storage.setItem(DEMO_SCENARIO_KEY, String(next));
        setRevision(next);
        setError('');
      } catch {
        setError('Could not reset demo data.');
      } finally {
        resetting.current = false;
      }
    },
  };
  return (
    <DemoContext.Provider value={api}>
      {ready ? children : <AppText>Loading settings…</AppText>}
    </DemoContext.Provider>
  );
}
