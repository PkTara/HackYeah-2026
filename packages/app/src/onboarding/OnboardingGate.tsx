import type { ReactNode } from 'react';

/**
 * Shows the onboarding flow instead of the app when it should run.
 * Placeholder: always shows the app. Being built.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
