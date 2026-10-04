import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import {
  createBackend,
  createMedia,
  createLocalBackend,
  type ClimbingBackend,
  type MediaClient,
  type BackendConfig,
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
import { Navigator, type NavigationEntry } from './navigation/Navigator';
import { OnboardingGate } from './onboarding/OnboardingGate';
import { screens, type RouteName } from './navigation/routes';
import { GameProvider } from './state/GameProvider';
import { DemoProvider, useDemo } from './demo/DemoProvider';
import { DemoControls } from './demo/DemoControls';
import { demoSeed } from './demo/seed';
import { emptyGame, toLocalDate } from '@hackyeah/core';
import { scopedStorage } from './demo/settings';
import { createDemoMedia } from './demo/media';
import { simulatedCamera } from './demo/camera';
import { PrivacyProvider } from './privacy/PrivacyProvider';

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
  /** Demo real services use a separate anonymous identity. */
  backendConfig?: BackendConfig;
};

export function App({
  capabilities = platformCapabilities,
  backend,
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
  media,
  today,
  initialRoute = 'Profile',
  backendConfig,
}: Props) {
  const demo = useDemo();
  const navigationStack = useRef<readonly NavigationEntry<RouteName>[]>([
    { route: initialRoute, params: {} },
  ]);
  const rememberStack = useCallback(
    (stack: readonly NavigationEntry<RouteName>[]) => {
      navigationStack.current = stack;
    },
    [],
  );
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
  return (
    <CapabilitiesContext.Provider value={activeCapabilities}>
      <MediaContext.Provider value={demo.settings.enabled ? demoMedia : camera}>
        <GameProvider
          key={
            demo.settings.enabled
              ? `demo-${demo.settings.profile}-${demo.settings.camera}-${demo.settings.analysis}-${demo.settings.handPhotos}-${demo.revision}`
              : 'normal'
          }
          backend={activeData}
          today={today}
        >
          <View style={{ flex: 1 }}>
            <StatusGate>
              <OnboardingGate
                restoreSetup={setupOpen.current}
                onVisibilityChange={rememberSetup}
              >
                <Navigator<RouteName>
                  initialRoute={initialRoute}
                  screens={screens}
                  initialStack={navigationStack.current}
                  onStackChange={rememberStack}
                />
              </OnboardingGate>
            </StatusGate>
            <CelebrationOverlay />
            <SyncNotice />
          </View>
        </GameProvider>
        <DemoControls />
      </MediaContext.Provider>
    </CapabilitiesContext.Provider>
  );
}
