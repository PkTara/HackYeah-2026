import { createContext, useContext } from 'react';
import type { MediaClient } from '@hackyeah/data';

/**
 * The camera's media client (packages/data/src/media.ts), handed down like
 * the backend: <App media={...}>. null when no server is set, as in the
 * on-device demo; the camera screens then say they need the server.
 */
export const MediaContext = createContext<MediaClient | null>(null);

export function useMedia(): MediaClient | null {
  return useContext(MediaContext);
}
