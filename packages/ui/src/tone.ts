import { createContext, useContext } from 'react';
import { useTheme } from './theme';

/**
 * Text colours for whatever surface the text sits on. Panels and buttons
 * provide one, so AppText and PixelText stay readable on banana, wood or
 * the canopy background without every caller passing colours.
 */
export type Tone = Readonly<{ text: string; textMuted: string }>;

export const ToneContext = createContext<Tone | null>(null);

export function useTone(): Tone {
  const theme = useTheme();
  return (
    useContext(ToneContext) ?? {
      text: theme.colors.text,
      textMuted: theme.colors.textMuted,
    }
  );
}
