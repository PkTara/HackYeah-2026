import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { ScreenCornerContext, WorldContext } from '@hackyeah/ui';
import {
  createBackend,
  createLocalSportBackend,
  createMedia,
  createLocalBackend,
  type ClimbingBackend,
  type MediaClient,
  type BackendConfig,
  type SportBackend,
} from '@hackyeah/data';
import {
  capabilities as platformCapabilities,
  type Capabilities,
} from '@hackyeah/platform';
import { CapabilitiesContext } from './capabilities';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { MediaContext } from './media';
import { MusicButton, MusicProvider } from './music';
import { SfxProvider } from './sfx';
import { StatusGate } from './components/StatusGate';
import { SyncNotice } from './components/SyncNotice';
import { Navigator, type NavigationEntry } from './navigation/Navigator';
import { OnboardingGate } from './onboarding/OnboardingGate';
import { isSportRoute, screens, type RouteName } from './navigation/routes';
import { GameProvider } from './state/GameProvider';
import { DemoProvider, useDemo } from './demo/DemoProvider';
import { DemoControls } from './demo/DemoControls';
import { demoSeed } from './demo/seed';
import { emptyGame, toLocalDate, type PetMode } from '@hackyeah/core';
import { scopedStorage } from './demo/settings';
import { createDemoMedia } from './demo/media';
import { simulatedCamera } from './demo/camera';
import { PrivacyProvider } from './privacy/PrivacyProvider';
import { SPORT_VIEWS } from './sports';
import { SportProvider, useSport } from './state/SportProvider';

/** The last navigation stack and the mode it was in. */
type KeptStack = Readonly<{
  mode: PetMode | null;
  stack: readonly NavigationEntry<RouteName>[];
}>;

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
  /** Demo real services use a separate anonymous identity. */
  backendConfig?: BackendConfig;
};

export function App({
  capabilities = platformCapabilities,
  backend,
  sportBackend,
  media,
  today,
  initialRoute = 'Profile',
  backendConfig,
}: Props) {
  return (
    <PrivacyProvider storage={capabilities.storage}>
      <DemoProvider storage={capabilities.storage}>
        <AppRuntime
          capabilities={capabilities}
          backend={backend}
          sportBackend={sportBackend}
          media={media}
          today={today}
          initialRoute={initialRoute}
          backendConfig={backendConfig}
        />
      </DemoProvider>
    </PrivacyProvider>
  );
}

function AppRuntime({
  capabilities = platformCapabilities,
  backend,
  sportBackend,
  media,
  today,
  initialRoute = 'Profile',
  backendConfig,
}: Props) {
  const demo = useDemo();
  // The navigation stack survives the GameProvider remount on a demo switch.
  // Before the first navigation it belongs to no mode, so the start route
  // comes from initialRoute.
  const navigationStack = useRef<KeptStack>({ mode: null, stack: [] });
  const rememberStack = useCallback((kept: KeptStack) => {
    navigationStack.current = kept;
  }, []);
  const setupOpen = useRef(false);
  const rememberSetup = useCallback((open: boolean) => {
    setupOpen.current = open;
  }, []);
  const demoData = useMemo(
    () =>
      createLocalBackend(
        demo.storage!,
        demoSeed(today ?? toLocalDate(new Date())),
      ),
    [demo.storage, today],
  );
  const data = useMemo(
    () => backend ?? createBackend(capabilities.storage, backendConfig),
    [backend, capabilities.storage, backendConfig],
  );
  const sports = useMemo(
    () => sportBackend ?? createLocalSportBackend(capabilities.storage),
    [sportBackend, capabilities.storage],
  );
  const camera = useMemo(
    () =>
      media === undefined
        ? createMedia(capabilities.storage, backendConfig)
        : media,
    [media, capabilities.storage, backendConfig],
  );
  const serviceStorage = useMemo(
    () => scopedStorage(demo.storage!, 'services/'),
    [demo.storage],
  );
  const demoRealBackend = useMemo(() => {
    const configured = createBackend(serviceStorage, backendConfig);
    return configured.kind === 'remote'
      ? configured
      : createLocalBackend(serviceStorage, {
          ...emptyGame,
          onboardingSkipped: true,
        });
  }, [serviceStorage, backendConfig]);
  const demoRealMedia = useMemo(
    () => createMedia(serviceStorage, backendConfig),
    [serviceStorage, backendConfig],
  );
  const activeData = demo.settings.enabled
    ? demo.settings.profile
      ? demoData
      : demoRealBackend
    : data;
  const demoMedia = useMemo(
    () =>
      createDemoMedia({
        storage: demo.storage!,
        backend: activeData,
        analysis: demo.settings.analysis,
        handPhotos: demo.settings.handPhotos,
        real: demoRealMedia,
        prepareReal: () => demoRealBackend.load(),
        simulatedInput: demo.settings.camera,
        today,
      }),
    [
      demo.storage,
      activeData,
      demo.settings.analysis,
      demo.settings.handPhotos,
      demo.settings.camera,
      demoRealMedia,
      demoRealBackend,
      today,
    ],
  );
  const activeCapabilities =
    demo.settings.enabled && demo.settings.camera
      ? { ...capabilities, camera: simulatedCamera }
      : capabilities;
  // The music button sits in the top-right corner of every page, setup and
  // demo controls included. Without a music player there is no button and
  // no space kept.
  const corner = useMemo(
    () => (capabilities.music ? <MusicButton /> : null),
    [capabilities.music],
  );
  // Music and sound effects sit outside GameProvider, which remounts when a
  // demo switch changes, so the music keeps playing through demo changes.
  return (
    <CapabilitiesContext.Provider value={activeCapabilities}>
      <MediaContext.Provider value={demo.settings.enabled ? demoMedia : camera}>
        <MusicProvider>
          <SfxProvider>
            <ScreenCornerContext.Provider value={corner}>
              <GameProvider
                key={
                  demo.settings.enabled
                    ? `demo-${demo.settings.profile}-${demo.settings.camera}-${demo.settings.analysis}-${demo.settings.handPhotos}-${demo.revision}`
                    : 'normal'
                }
                backend={activeData}
                today={today}
              >
                <SportProvider backend={sports} today={today}>
                  <ModeShell
                    initialRoute={initialRoute}
                    navigationStack={navigationStack.current}
                    onStackChange={rememberStack}
                    setupOpen={setupOpen.current}
                    onSetupChange={rememberSetup}
                  />
                </SportProvider>
              </GameProvider>
            </ScreenCornerContext.Provider>
          </SfxProvider>
        </MusicProvider>
      </MediaContext.Provider>
    </CapabilitiesContext.Provider>
  );
}

/**
 * Draws the app in the active pet's world: the jungle for the monkey, the
 * savanna for the gazelle, the ocean for the dolphin. Switching mode starts a
 * fresh navigation stack on that mode's profile. A stack kept across a demo
 * remount is only restored in the mode it belongs to.
 */
function ModeShell({
  initialRoute,
  navigationStack,
  onStackChange,
  setupOpen,
  onSetupChange,
}: {
  initialRoute: RouteName;
  navigationStack: KeptStack;
  onStackChange: (kept: KeptStack) => void;
  setupOpen: boolean;
  onSetupChange: (open: boolean) => void;
}) {
  const { mode, status, sport } = useSport();
  const rememberStack = useCallback(
    (stack: readonly NavigationEntry<RouteName>[]) =>
      onStackChange({ mode, stack }),
    [mode, onStackChange],
  );
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
  // The gazelle and the dolphin share routes, so the kept stack is matched by
  // mode, not by route.
  const kept =
    navigationStack.mode === mode && navigationStack.stack.length > 0
      ? navigationStack.stack
      : undefined;
  const navigator = (
    <Navigator<RouteName>
      key={mode}
      initialRoute={start}
      screens={screens}
      initialStack={kept}
      onStackChange={rememberStack}
    />
  );
  return (
    <WorldContext.Provider
      value={monkey ? 'jungle' : SPORT_VIEWS[sport.id].world}
    >
      <View style={{ flex: 1 }}>
        <StatusGate>
          {monkey ? (
            // Setup asks about climbing, so only the monkey runs it.
            <OnboardingGate
              restoreSetup={setupOpen}
              onVisibilityChange={onSetupChange}
            >
              {navigator}
            </OnboardingGate>
          ) : (
            navigator
          )}
        </StatusGate>
        <CelebrationOverlay />
        <SyncNotice />
      </View>
      <DemoControls />
    </WorldContext.Provider>
  );
}
