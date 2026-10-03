import { createContext, useContext } from 'react';
import {
  capabilities as platformCapabilities,
  type Capabilities,
} from '@hackyeah/platform';

/**
 * Screens read platform services from context instead of importing them, so tests
 * (or a different host) can inject their own implementation via <App capabilities>.
 */
export const CapabilitiesContext =
  createContext<Capabilities>(platformCapabilities);

export function useCapabilities(): Capabilities {
  return useContext(CapabilitiesContext);
}
