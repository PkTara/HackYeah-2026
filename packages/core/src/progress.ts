/**
 * Monkey progression. This is a game rule, not an assessment: finishing a
 * quest earns XP but never changes the climbing profile.
 */

export const XP_PER_QUEST = 10;
export const XP_PER_LEVEL = 50;

export type Cosmetic =
  | 'headband'
  | 'chalk-bag'
  | 'race-bib'
  | 'medal'
  | 'swim-cap'
  | 'goggles';

export type Unlock = Readonly<{ id: Cosmetic; level: number; name: string }>;

/** Unlocked when the monkey reaches the level. */
export const COSMETICS: readonly Unlock[] = [
  { id: 'headband', level: 2, name: 'Banana headband' },
  { id: 'chalk-bag', level: 3, name: 'Chalk bag' },
];

/** Unlocked when the gazelle reaches the level. Same XP rules as the monkey. */
export const GAZELLE_COSMETICS: readonly Unlock[] = [
  { id: 'race-bib', level: 2, name: 'Race bib' },
  { id: 'medal', level: 3, name: 'Gold medal' },
];

/** Unlocked when the dolphin reaches the level. */
export const DOLPHIN_COSMETICS: readonly Unlock[] = [
  { id: 'swim-cap', level: 2, name: 'Swim cap' },
  { id: 'goggles', level: 3, name: 'Pair of goggles' },
];

/** Which pet, and so which sport, the app is showing. */
export type PetMode = 'monkey' | 'gazelle' | 'dolphin';

export type PetStatus = Readonly<{
  xp: number;
  level: number;
  /** XP earned inside the current level, 0 to XP_PER_LEVEL - 1. */
  xpInLevel: number;
  cosmetics: readonly Cosmetic[];
}>;

/** XP comes from unique completed quests, so repeated taps cannot farm it. */
export function petStatus(
  completedQuestIds: readonly string[],
  unlocks: readonly Unlock[] = COSMETICS,
): PetStatus {
  const xp = new Set(completedQuestIds).size * XP_PER_QUEST;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    xp,
    level,
    xpInLevel: xp % XP_PER_LEVEL,
    cosmetics: unlocks.filter(c => c.level <= level).map(c => c.id),
  };
}
