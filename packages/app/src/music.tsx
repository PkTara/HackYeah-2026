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
import { IconButton } from '@hackyeah/ui';
import { useCapabilities } from './capabilities';

/** Saved choice: "on" or "off". Off until the person turns it on. */
export const MUSIC_KEY = 'climbing-monkey/music/v1';

type MusicApi = Readonly<{
  /** False where the platform has no music player; the button is hidden. */
  available: boolean;
  /** The person's choice. On can mean "waiting for the first tap". */
  on: boolean;
  toggle: () => void;
}>;

const MusicContext = createContext<MusicApi>({
  available: false,
  on: false,
  toggle: () => {},
});

export function useMusic(): MusicApi {
  return useContext(MusicContext);
}

/**
 * Owns the music on/off choice for the whole app, so it survives screen
 * changes. Music never starts by itself: it starts when the button is
 * pressed, or, if it was left on last time, at the first tap or key press
 * anywhere (browsers block sound before that).
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const { music, storage } = useCapabilities();
  const [on, setOn] = useState(false);
  /** Set once the person has pressed the button; the saved choice is then stale. */
  const pressed = useRef(false);
  const cancelWait = useRef<(() => void) | null>(null);

  const stopWaiting = useCallback(() => {
    cancelWait.current?.();
    cancelWait.current = null;
  }, []);

  useEffect(() => {
    if (!music) {
      return;
    }
    let current = true;
    storage
      .getItem(MUSIC_KEY)
      .then(saved => {
        if (!current || pressed.current || saved !== 'on') {
          return;
        }
        setOn(true);
        cancelWait.current = music.onNextGesture(() => {
          cancelWait.current = null;
          music.play().catch(() => {});
        });
      })
      .catch(() => {});
    return () => {
      current = false;
      stopWaiting();
      music.stop();
    };
  }, [music, storage, stopWaiting]);

  const toggle = useCallback(() => {
    if (!music) {
      return;
    }
    pressed.current = true;
    stopWaiting();
    if (on) {
      music.stop();
    } else {
      music.play().catch(() => {});
    }
    setOn(!on);
    storage.setItem(MUSIC_KEY, on ? 'off' : 'on').catch(() => {});
  }, [music, storage, on, stopWaiting]);

  const api = useMemo<MusicApi>(
    () => ({ available: Boolean(music), on, toggle }),
    [music, on, toggle],
  );
  return <MusicContext.Provider value={api}>{children}</MusicContext.Provider>;
}

/** The small speaker key in the top-right corner of every page. */
export function MusicButton() {
  const { available, on, toggle } = useMusic();
  if (!available) {
    return null;
  }
  return (
    <IconButton
      icon={on ? 'speaker' : 'speakerOff'}
      accessibilityLabel={on ? 'Mute music' : 'Play music'}
      selected={on}
      onPress={toggle}
    />
  );
}
