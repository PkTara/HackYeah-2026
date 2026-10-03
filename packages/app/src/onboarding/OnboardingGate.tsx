import { useEffect, useState, type ReactNode } from 'react';
import { OnboardingFlow } from './OnboardingFlow';

/** Add this to the web address to preview the flow: http://localhost:5173/#onboarding */
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

/**
 * Shows the onboarding flow instead of the app when it should run.
 *
 * For now it only runs as a preview: on the web with #onboarding in the
 * address. Finishing or skipping shows the app; nothing is saved yet. On
 * first launch it should run for real and save its result (not wired yet).
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(previewRequested);

  // Changing the address to #onboarding while the app is open starts it too.
  useEffect(() => {
    const browser = globalThis as BrowserGlobals;
    const onHash = () => setShow(previewRequested());
    browser.addEventListener?.('hashchange', onHash);
    return () => browser.removeEventListener?.('hashchange', onHash);
  }, []);

  if (!show) {
    return <>{children}</>;
  }
  return (
    <OnboardingFlow onFinish={() => setShow(false)} onSkip={() => setShow(false)} />
  );
}
