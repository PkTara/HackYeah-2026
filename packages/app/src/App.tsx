import { useMemo } from 'react';
import { View } from 'react-native';
import {
  createBackend,
  createLocalSportBackend,
  createMedia,
  type ClimbingBackend,
  type MediaClient,
  type SportBackend,
} from '@hackyeah/data';
import {
  capabilities as platformCapabilities,
  type Capabilities,
} from '@hackyeah/platform';
import { WorldContext } from '@hackyeah/ui';
import { CapabilitiesContext } from './capabilities';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { MediaContext } from './media';
import { StatusGate } from './components/StatusGate';
import { SyncNotice } from './components/SyncNotice';
import { Navigator } from './navigation/Navigator';
import { OnboardingGate } from './onboarding/OnboardingGate';
import { isSportRoute, screens, type RouteName } from './navigation/routes';
import { GameProvider } from './state/GameProvider';
import { SPORT_VIEWS } from './sports';
import { SportProvider, useSport } from './state/SportProvider';

type Props = {
  /** Override platform services, e.g. with fakes in tests. */
  capabilities?: Capabilities;
  /**
   * Where data is loaded from and saved to. Defaults to createBackend()
   * (on-device storage unless API_BASE_URL is set in @hackyeah/data).
   */
  backend?: ClimbingBackend;
  /**
   * The sport modes' data (running, swimming) and the saved pet mode.
   * Defaults to on-device storage; the server does not know these sports yet.
   */
  sportBackend?: SportBackend;
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
  sportBackend,
  media,
  today,
  initialRoute = 'Profile',
}: Props) {
  const data = useMemo(
    () => backend ?? createBackend(capabilities.storage),
    [backend, capabilities.storage],
  );
  const sports = useMemo(
    () => sportBackend ?? createLocalSportBackend(capabilities.storage),
    [sportBackend, capabilities.storage],
  );
  const camera = useMemo(
    () => (media === undefined ? createMedia(capabilities.storage) : media),
    [media, capabilities.storage],
  );
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <MediaContext.Provider value={camera}>
        <GameProvider backend={data} today={today}>
          <SportProvider backend={sports} today={today}>
            <ModeShell initialRoute={initialRoute} />
          </SportProvider>
        </GameProvider>
      </MediaContext.Provider>
    </CapabilitiesContext.Provider>
  );
}

/**
 * Draws the app in the active pet's world: the jungle for the monkey, the
 * savanna for the gazelle, the ocean for the dolphin. Switching mode starts a
 * fresh navigation stack on that mode's profile.
 */
function ModeShell({ initialRoute }: { initialRoute: RouteName }) {
  const { mode, status, sport } = useSport();
  if (status === 'loading') {
    return null; // a quick storage read; avoids flashing the wrong world
  }
  const monkey = mode === 'monkey';
  // A deep link only applies when it belongs to the mode being shown.
  const start =
    isSportRoute(initialRoute) !== monkey
      ? initialRoute
      : monkey
      ? 'Profile'
      : 'SportProfile';
  const navigator = (
    <Navigator<RouteName> key={mode} initialRoute={start} screens={screens} />
  );
  return (
    <WorldContext.Provider
      value={monkey ? 'jungle' : SPORT_VIEWS[sport.id].world}
    >
      <View style={{ flex: 1 }}>
        <StatusGate>
          {monkey ? (
            // Setup asks about climbing, so only the monkey runs it.
            <OnboardingGate>{navigator}</OnboardingGate>
          ) : (
            navigator
          )}
        </StatusGate>
        <CelebrationOverlay />
        <SyncNotice />
      </View>
    </WorldContext.Provider>
  );
}
