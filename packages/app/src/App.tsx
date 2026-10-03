import { useMemo } from 'react';
import { View } from 'react-native';
import { createBackend, type ClimbingBackend } from '@hackyeah/data';
import {
  capabilities as platformCapabilities,
  type Capabilities,
} from '@hackyeah/platform';
import { CapabilitiesContext } from './capabilities';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { StatusGate } from './components/StatusGate';
import { SyncNotice } from './components/SyncNotice';
import { Navigator } from './navigation/Navigator';
import { OnboardingGate } from './onboarding/OnboardingGate';
import { screens, type RouteName } from './navigation/routes';
import { GameProvider } from './state/GameProvider';

type Props = {
  /** Override platform services, e.g. with fakes in tests. */
  capabilities?: Capabilities;
  /**
   * Where data is loaded from and saved to. Defaults to createBackend()
   * (on-device storage unless API_BASE_URL is set in @hackyeah/data).
   */
  backend?: ClimbingBackend;
  /** Fixed "today" for tests. */
  today?: string;
};

export function App({
  capabilities = platformCapabilities,
  backend,
  today,
}: Props) {
  const data = useMemo(
    () => backend ?? createBackend(capabilities.storage),
    [backend, capabilities.storage],
  );
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <GameProvider backend={data} today={today}>
        <View style={{ flex: 1 }}>
          <StatusGate>
            <OnboardingGate>
              <Navigator<RouteName> initialRoute="Profile" screens={screens} />
            </OnboardingGate>
          </StatusGate>
          <CelebrationOverlay />
          <SyncNotice />
        </View>
      </GameProvider>
    </CapabilitiesContext.Provider>
  );
}
