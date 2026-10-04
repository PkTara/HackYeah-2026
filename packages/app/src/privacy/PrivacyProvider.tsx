import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { KeyValueStore } from '@hackyeah/platform';
import { AppText } from '@hackyeah/ui';

export const PRIVACY_KEY = 'climbing-monkey/privacy/v1';
export type PrivacyChoices = Readonly<{
  cameraAnalysis: boolean;
  handPhotos: boolean;
}>;
const denied: PrivacyChoices = { cameraAnalysis: false, handPhotos: false };
type PrivacyApi = {
  choices: PrivacyChoices;
  update: (change: Partial<PrivacyChoices>) => void;
  available: boolean;
  error: string;
};
const PrivacyContext = createContext<PrivacyApi>({
  choices: denied,
  update: () => {},
  available: false,
  error: '',
});
export const usePrivacy = () => useContext(PrivacyContext);

export function PrivacyProvider({
  storage,
  children,
}: {
  storage: KeyValueStore;
  children: ReactNode;
}) {
  const [choices, setChoices] = useState(denied);
  const current = useRef(denied);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    storage.getItem(PRIVACY_KEY).then(
      json => {
        if (!active) {
          return;
        }
        try {
          const value = JSON.parse(json ?? '{}');
          current.current = {
            cameraAnalysis: value?.cameraAnalysis === true,
            handPhotos: value?.handPhotos === true,
          };
          setChoices(current.current);
        } catch {
          setChoices(denied);
        }
        setReady(true);
      },
      () => {
        if (active) {
          setChoices(denied);
          setError(
            'Could not read permissions. Camera uploads remain disabled.',
          );
          setReady(true);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [storage]);
  const update = (change: Partial<PrivacyChoices>) => {
    const next = { ...current.current, ...change };
    current.current = next;
    setChoices(next);
    writes.current = writes.current
      .then(() =>
        storage.setItem(PRIVACY_KEY, JSON.stringify({ version: 1, ...next })),
      )
      .then(
        () => setError(''),
        () =>
          setError(
            'Could not save permissions. Your choices apply while this app stays open.',
          ),
      );
  };
  return (
    <PrivacyContext.Provider
      value={{ choices, update, available: true, error }}
    >
      {ready ? children : <AppText>Loading permissions…</AppText>}
    </PrivacyContext.Provider>
  );
}
