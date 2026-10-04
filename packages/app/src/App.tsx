import { useMemo } from 'react';
import { View } from 'react-native';
import {
  createBackend,
  createLocalRunBackend,
  createMedia,
  type ClimbingBackend,
  type MediaClient,
  type RunBackend,
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
import { isGazelleRoute, screens, type RouteName } from './navigation/routes';
import { GameProvider } from './state/GameProvider';
import { RunProvider, useRun } from './state/RunProvider';

type Props = {
  /** Override platform services, e.g. with fakes in tests. */
  capabilities?: Capabilities;
  /**
   * Where data is loaded from and saved to. Defaults to createBackend()
   * (on-device storage unless API_BASE_URL is set in @hackyeah/data).
   */
  backend?: ClimbingBackend;
  /**
   * Gazelle mode's runs and the saved pet mode. Defaults to on-device
   * storage; the server does not know about running yet.
   */
  runBackend?: RunBackend;
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
  runBackend,
  media,
  today,
  initialRoute = 'Profile',
}: Props) {
  const data = useMemo(
    () => backend ?? createBackend(capabilities.storage),
    [backend, capabilities.storage],
  );
  const runs = useMemo(
    () => runBackend ?? createLocalRunBackend(capabilities.storage),
    [runBackend, capabilities.storage],
  );
  const camera = useMemo(
    () => (media === undefined ? createMedia(capabilities.storage) : media),
    [media, capabilities.storage],
  );
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <MediaContext.Provider value={camera}>
        <GameProvider backend={data} today={today}>
          <RunProvider backend={runs} today={today}>
            <ModeShell initialRoute={initialRoute} />
          </RunProvider>
        </GameProvider>
      </MediaContext.Provider>
    </CapabilitiesContext.Provider>
  );
}

/**
 * Draws the app in the active pet's world: the jungle for the monkey, the
 * savanna for the gazelle. Switching mode starts a fresh navigation stack on
 * that mode's profile.
 */
function ModeShell({ initialRoute }: { initialRoute: RouteName }) {
  const { mode, status } = useRun();
  if (status === 'loading') {
    return null; // a quick storage read; avoids flashing the wrong world
  }
  const gazelle = mode === 'gazelle';
  // A deep link only applies when it belongs to the mode being shown.
  const start =
    isGazelleRoute(initialRoute) === gazelle
      ? initialRoute
      : gazelle
      ? 'Run'
      : 'Profile';
  return (
    <WorldContext.Provider value={gazelle ? 'savanna' : 'jungle'}>
      <View style={{ flex: 1 }}>
        <StatusGate>
          {gazelle ? (
            <Navigator<RouteName>
              key={mode}
              initialRoute={start}
              screens={screens}
            />
          ) : (
            // Setup asks about climbing, so only the monkey runs it.
            <OnboardingGate>
              <Navigator<RouteName>
                key={mode}
                initialRoute={start}
                screens={screens}
              />
            </OnboardingGate>
          )}
        </StatusGate>
        <CelebrationOverlay />
        <SyncNotice />
      </View>
    </WorldContext.Provider>
  );
}
