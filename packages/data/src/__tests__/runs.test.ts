import { emptyRun, sampleRunGame } from '@hackyeah/core';
import { createMemoryStore } from '@hackyeah/platform';
import { createLocalRunBackend } from '../runs';

const run = {
  id: 'r1',
  date: '2026-10-03',
  type: 'easy',
  surface: 'trail',
  km: 5,
  minutes: 32,
  finished: true,
} as const;

describe('local run backend', () => {
  it('starts from the sample runs on a fresh install', async () => {
    const backend = createLocalRunBackend(createMemoryStore());
    expect(await backend.load()).toEqual(sampleRunGame);
  });

  it('saves every change so a restart sees it', async () => {
    const storage = createMemoryStore();
    const first = createLocalRunBackend(storage, emptyRun);
    await first.addRun(run);
    await first.completeQuest('easy-loop');
    await first.completeQuest('easy-loop');
    await first.setLegFlag(
      { side: 'right', part: 'shin', date: '2026-10-03' },
      true,
    );

    const again = await createLocalRunBackend(storage).load();
    expect(again.runs).toEqual([run]);
    expect(again.completed).toEqual(['easy-loop']);
    expect(again.legFlags).toHaveLength(1);
  });

  it('resets to empty, not back to the sample', async () => {
    const storage = createMemoryStore();
    await createLocalRunBackend(storage).reset();
    expect(await createLocalRunBackend(storage).load()).toEqual(emptyRun);
  });

  it('remembers the mode, starting as the monkey', async () => {
    const storage = createMemoryStore();
    const backend = createLocalRunBackend(storage);
    expect(await backend.loadMode()).toBe('monkey');
    await backend.saveMode('gazelle');
    expect(await createLocalRunBackend(storage).loadMode()).toBe('gazelle');
  });
});
