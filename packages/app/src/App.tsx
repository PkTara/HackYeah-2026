import { useMemo } from 'react';
import { View } from 'react-native';
import {
  createBackend,
  createMedia,
  type ClimbingBackend,
  type MediaClient,
} from '@hackyeah/data';
import {
  capabilities as platformCapabilities,
  type Capabilities,
} from '@hackyeah/platform';
import { CapabilitiesContext } from './capabilities';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { MediaContext } from './media';
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
  /**
   * Camera uploads: pose analysis and hand photos. Defaults to createMedia()
   * (the server at API_BASE_URL, or none). Pass null for no server.
   */
  media?: MediaClient | null;
  /** Fixed "today" for tests. */
  today?: string;
  /** First screen. Hosts can deep link, e.g. the web host reads #Hands. */
  initialRoute?: RouteName;
};

export function App({
  capabilities = platformCapabilities,
  backend,
  media,
  today,
  initialRoute = 'Profile',
}: Props) {
  const data = useMemo(
    () => backend ?? createBackend(capabilities.storage),
    [backend, capabilities.storage],
  );
  const camera = useMemo(
    () => (media === undefined ? createMedia(capabilities.storage) : media),
    [media, capabilities.storage],
  );
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <MediaContext.Provider value={camera}>
        <GameProvider backend={data} today={today}>
          <View style={{ flex: 1 }}>
            <StatusGate>
              <OnboardingGate>
                <Navigator<RouteName>
                  initialRoute={initialRoute}
                  screens={screens}
                />
              </OnboardingGate>
            </StatusGate>
            <CelebrationOverlay />
            <SyncNotice />
          </View>
        </GameProvider>
      </MediaContext.Provider>
    </CapabilitiesContext.Provider>
  );
}
