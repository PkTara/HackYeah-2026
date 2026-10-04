import { createContext, useContext } from 'react';

/**
 * Sounds the kit itself asks for: a click when a control is pressed, a
 * brighter tick when a chip is chosen, and a murmur while a speech bubble
 * types. Rewards (success, level up) are the app's business.
 */
export type UiSound = 'tap' | 'select' | 'typing';

/**
 * Plays a kit sound. `variant` picks a fixed pitch step for the typing
 * murmur (the bubble passes the letter's character code).
 */
export type PlayUiSound = (sound: UiSound, variant?: number) => void;

/**
 * The app provides the player (see packages/app/src/sfx.tsx). Without a
 * provider the kit is silent, so it works the same in tests and on
 * platforms without sound.
 */
export const UiSoundContext = createContext<PlayUiSound>(() => {});

export function useUiSound(): PlayUiSound {
  return useContext(UiSoundContext);
}
