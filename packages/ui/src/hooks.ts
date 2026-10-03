import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the OS asks for less motion. Animations then hold still. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    let sub: { remove: () => void } | undefined;
    try {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(value => live && setReduced(value))
        .catch(() => {});
      sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    } catch {
      // Not every platform implements this; animations simply stay on.
    }
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return reduced;
}

/**
 * A counter that ticks every `ms` while `running`. Pixel art moves in whole
 * steps, so sprites read this instead of using smooth tweens.
 */
export function useTicker(ms: number, running = true): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => setTick(t => t + 1), ms);
    return () => clearInterval(id);
  }, [ms, running]);
  return tick;
}
