import type { PetMode } from '../progress';
import type { Sport, SportId } from '../sport';
import { RUNNING } from './running';
import { SWIMMING } from './swimming';

export { RUNNING, SWIMMING };

export const SPORTS: Readonly<Record<SportId, Sport>> = {
  run: RUNNING,
  swim: SWIMMING,
};

export const SPORT_IDS: readonly SportId[] = ['run', 'swim'];

/** The sport a pet leads, or null for the monkey (climbing has its own rules). */
export function sportFor(mode: PetMode): Sport | null {
  return SPORT_IDS.map(id => SPORTS[id]).find(s => s.pet === mode) ?? null;
}
