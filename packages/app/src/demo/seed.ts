import { sampleGame, type GameState } from '@hackyeah/core';

export function demoSeed(today: string): GameState {
  return {
    ...sampleGame,
    onboardingSkipped: true,
    reach: { heightCm: 174, armSpanCm: 179, date: today },
    flags: [{ side: 'right', finger: 'ring', date: today, spots: [] }],
    baseline: [
      {
        testId: 'dead-hang',
        value: 35,
        unit: 'seconds',
        method: 'typed',
        date: today,
        sample: true,
      },
      {
        testId: 'pull-ups',
        value: 6,
        unit: 'reps',
        method: 'typed',
        date: today,
        sample: true,
      },
      {
        testId: 'sit-and-reach',
        value: 4,
        unit: 'cm',
        method: 'typed',
        date: today,
        sample: true,
      },
      {
        testId: 'plank',
        value: 45,
        unit: 'seconds',
        method: 'typed',
        date: today,
        sample: true,
      },
      {
        testId: 'one-leg-balance',
        value: 30,
        unit: 'seconds',
        method: 'typed',
        date: today,
        sample: true,
      },
      {
        testId: 'push-ups',
        value: 12,
        unit: 'reps',
        method: 'typed',
        date: today,
        sample: true,
      },
    ],
  };
}
