import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useGame } from '../state/GameProvider';
import { OnboardingFlow } from './OnboardingFlow';

/** Add this to the web address to open setup again: http://localhost:5173/#onboarding */
const PREVIEW_HASH = '#onboarding';

// Typed locally so shared code doesn't need the DOM lib. On native these are
// all undefined.
type BrowserGlobals = {
  location?: { hash?: string };
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function previewRequested(): boolean {
  try {
    return (globalThis as BrowserGlobals).location?.hash === PREVIEW_HASH;
  } catch {
    return false;
  }
}

type SetupApi = Readonly<{
  /** Runs setup again, for example from the Tests tab. */
  redoSetup: () => void;
}>;

const SetupContext = createContext<SetupApi>({ redoSetup: () => {} });

export function useSetup(): SetupApi {
  return useContext(SetupContext);
}

/**
 * Shows the onboarding flow instead of the app until setup is finished or
 * skipped. It can be run again later; finishing again replaces the answers,
 * and skipping a rerun leaves the earlier answers as they were.
 */
export function OnboardingGate({
  children,
  restoreSetup = false,
  onVisibilityChange,
}: {
  children: ReactNode;
  /** Keep an open setup session across an active-dataset remount. */
  restoreSetup?: boolean;
  onVisibilityChange?: (open: boolean) => void;
}) {
  const { state, today, finishOnboarding, skipOnboarding } = useGame();
  const [again, setAgain] = useState(() => restoreSetup || previewRequested());

  // Changing the address to #onboarding while the app is open starts it too.
  useEffect(() => {
    const browser = globalThis as BrowserGlobals;
    const onHash = () => {
      if (previewRequested()) {
        setAgain(true);
      }
    };
    browser.addEventListener?.('hashchange', onHash);
    return () => browser.removeEventListener?.('hashchange', onHash);
  }, []);

  const api = useMemo<SetupApi>(
    () => ({ redoSetup: () => setAgain(true) }),
    [],
  );
  const firstRun = state.onboarding === null && !state.onboardingSkipped;
  useEffect(
    () => onVisibilityChange?.(firstRun || again),
    [firstRun, again, onVisibilityChange],
  );

  if (!firstRun && !again) {
    return (
      <SetupContext.Provider value={api}>{children}</SetupContext.Provider>
    );
  }
  return (
    <OnboardingFlow
      today={today}
      onFinish={result => {
        finishOnboarding(result);
        setAgain(false);
      }}
      onSkip={() => {
        if (firstRun) {
          skipOnboarding();
        }
        setAgain(false);
      }}
    />
  );
}
