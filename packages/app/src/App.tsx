import {
  capabilities as platformCapabilities,
  type Capabilities,
} from '@hackyeah/platform';
import { CapabilitiesContext } from './capabilities';
import { Navigator } from './navigation/Navigator';
import { screens, type RouteName } from './navigation/routes';

type Props = {
  /** Override platform services, e.g. with fakes in tests. */
  capabilities?: Capabilities;
};

export function App({ capabilities = platformCapabilities }: Props) {
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <Navigator<RouteName> initialRoute="Home" screens={screens} />
    </CapabilitiesContext.Provider>
  );
}
