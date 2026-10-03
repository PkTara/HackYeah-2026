import { View } from 'react-native';
import {
  capabilities as platformCapabilities,
  type Capabilities,
} from '@hackyeah/platform';
import { CapabilitiesContext } from './capabilities';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { Navigator } from './navigation/Navigator';
import { screens, type RouteName } from './navigation/routes';
import { GameProvider } from './state/GameProvider';

type Props = {
  /** Override platform services, e.g. with fakes in tests. */
  capabilities?: Capabilities;
  /** Fixed "today" for tests. */
  today?: string;
};

export function App({ capabilities = platformCapabilities, today }: Props) {
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <GameProvider today={today}>
        <View style={{ flex: 1 }}>
          <Navigator<RouteName> initialRoute="Profile" screens={screens} />
          <CelebrationOverlay />
        </View>
      </GameProvider>
    </CapabilitiesContext.Provider>
  );
}
