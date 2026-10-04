import { RUNNING, SWIMMING, emptySport } from '@hackyeah/core';
import { createMemoryStore } from '@hackyeah/platform';
import { createLocalSportBackend } from '../sports';

const swim = {
  id: 's1',
  date: '2026-10-03',
  kind: 'free',
  place: 'pool',
  distance: 1000,
  minutes: 24,
  finished: true,
} as const;

describe('local sport backend', () => {
  it('starts each sport from its own sample on a fresh install', async () => {
    const backend = createLocalSportBackend(createMemoryStore());
    expect(await backend.load('run')).toEqual(RUNNING.sample);
    expect(await backend.load('swim')).toEqual(SWIMMING.sample);
  });

  it('saves every change so a restart sees it, one sport at a time', async () => {
    const storage = createMemoryStore();
    const first = createLocalSportBackend(storage, () => emptySport);
    await first.addSession('swim', swim);
    await first.completeQuest('swim', 'free-count');
    await first.completeQuest('swim', 'free-count');
    await first.setFlag(
      'swim',
      { side: 'right', part: 'shoulder', date: '2026-10-03' },
      true,
    );

    const again = createLocalSportBackend(storage, () => emptySport);
    const swimming = await again.load('swim');
    expect(swimming.logs).toEqual([swim]);
    expect(swimming.completed).toEqual(['free-count']);
    expect(swimming.flags).toHaveLength(1);
    expect(await again.load('run')).toEqual(emptySport);
  });

  it('resets one sport to empty, not back to the sample', async () => {
    const storage = createMemoryStore();
    await createLocalSportBackend(storage).reset('run');
    const again = createLocalSportBackend(storage);
    expect(await again.load('run')).toEqual(emptySport);
    expect(await again.load('swim')).toEqual(SWIMMING.sample);
  });

  it('remembers the mode, starting as the monkey', async () => {
    const storage = createMemoryStore();
    const backend = createLocalSportBackend(storage);
    expect(await backend.loadMode()).toBe('monkey');
    await backend.saveMode('dolphin');
    expect(await createLocalSportBackend(storage).loadMode()).toBe('dolphin');
  });
});
