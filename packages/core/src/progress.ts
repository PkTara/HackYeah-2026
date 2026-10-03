/**
 * Monkey progression. This is a game rule, not an assessment: finishing a
 * quest earns XP but never changes the climbing profile.
 */

export const XP_PER_QUEST = 10;
export const XP_PER_LEVEL = 50;

export type Cosmetic = 'headband' | 'chalk-bag';

/** Unlocked when the monkey reaches the level. */
export const COSMETICS: readonly Readonly<{
  id: Cosmetic;
  level: number;
  name: string;
}>[] = [
  { id: 'headband', level: 2, name: 'Banana headband' },
  { id: 'chalk-bag', level: 3, name: 'Chalk bag' },
];

export type PetStatus = Readonly<{
  xp: number;
  level: number;
  /** XP earned inside the current level, 0 to XP_PER_LEVEL - 1. */
  xpInLevel: number;
  cosmetics: readonly Cosmetic[];
}>;

/** XP comes from unique completed quests, so repeated taps cannot farm it. */
export function petStatus(completedQuestIds: readonly string[]): PetStatus {
  const xp = new Set(completedQuestIds).size * XP_PER_QUEST;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    xp,
    level,
    xpInLevel: xp % XP_PER_LEVEL,
    cosmetics: COSMETICS.filter(c => c.level <= level).map(c => c.id),
  };
}
