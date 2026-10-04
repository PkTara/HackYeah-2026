import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SfxName } from '@hackyeah/platform';
import { UiSoundContext, type PlayUiSound } from '@hackyeah/ui';
import { useCapabilities } from './capabilities';

/** Saved choice: "on" or "off". On (but quiet) until the person turns it off. */
export const SFX_KEY = 'climbing-monkey/sfx/v1';

type SfxApi = Readonly<{
  /** False where the platform has no sound effects; the switch is hidden. */
  available: boolean;
  /** The person's choice. */
  on: boolean;
  setOn: (on: boolean) => void;
  /** Plays an effect if they are on. Safe to call anywhere, any time. */
  play: (name: SfxName, variant?: number) => void;
}>;

const SfxContext = createContext<SfxApi>({
  available: false,
  on: false,
  setOn: () => {},
  play: () => {},
});

export function useSfx(): SfxApi {
  return useContext(SfxContext);
}

/**
 * Owns the sound effects switch for the whole app and hands the kit its
 * click and typing sounds (UiSoundContext), so Button, Chip and the speech
 * bubble make sounds without any screen asking for them. Rewards (a saved
 * climb, a quest, a level up) play from GameProvider.
 *
 * The capability itself drops sounds before the first tap and while the
 * page is hidden; this only adds the person's on/off choice.
 */
export function SfxProvider({ children }: { children: ReactNode }) {
  const { sfx, storage } = useCapabilities();
  const [on, setOnState] = useState(true);
  /** Set once the person has used the switch; the saved choice is then stale. */
  const changed = useRef(false);

  useEffect(() => {
    if (!sfx) {
      return;
    }
    let current = true;
    storage
      .getItem(SFX_KEY)
      .then(saved => {
        if (!current || changed.current) {
          return;
        }
        const enabled = saved !== 'off';
        sfx.setEnabled(enabled);
        setOnState(enabled);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [sfx, storage]);

  const setOn = useCallback(
    (next: boolean) => {
      if (!sfx) {
        return;
      }
      changed.current = true;
      // Synchronous, so the switch's own click is heard only when turning on.
      sfx.setEnabled(next);
      setOnState(next);
      storage.setItem(SFX_KEY, next ? 'on' : 'off').catch(() => {});
    },
    [sfx, storage],
  );

  const play = useCallback(
    (name: SfxName, variant?: number) => sfx?.play(name, variant),
    [sfx],
  );
  const playUi = useCallback<PlayUiSound>(
    (name, variant) => play(name, variant),
    [play],
  );

  const api = useMemo<SfxApi>(
    () => ({ available: Boolean(sfx), on: Boolean(sfx) && on, setOn, play }),
    [sfx, on, setOn, play],
  );
  return (
    <SfxContext.Provider value={api}>
      <UiSoundContext.Provider value={playUi}>{children}</UiSoundContext.Provider>
    </SfxContext.Provider>
  );
}
