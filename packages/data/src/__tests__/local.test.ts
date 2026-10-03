import { emptyGame, sampleGame } from '@hackyeah/core';
import { createMemoryStore } from '@hackyeah/platform';
import { createLocalBackend, LOCAL_STORAGE_KEY } from '../local';

const climb = {
  id: 'c1',
  date: '2026-10-03',
  terrain: 'vertical',
  movements: ['dynamic'],
  holds: ['jug'],
  grade: 'V3',
  sent: true,
} as const;

describe('local backend', () => {
  it('starts from the sample data on a fresh install', async () => {
    const backend = createLocalBackend(createMemoryStore());
    expect(await backend.load()).toEqual(sampleGame);
  });

  it('saves every change so a restart sees it', async () => {
    const storage = createMemoryStore();
    const first = createLocalBackend(storage, emptyGame);
    await first.addClimb(climb);
    await first.completeQuest('vertical-read');
    await first.completeQuest('vertical-read');
    await first.setHandFlag(
      { side: 'left', finger: 'index', date: '2026-10-03', spots: ['a2'] },
      true,
    );
    await first.saveReach({ armSpanCm: 180, heightCm: 176, date: '2026-10-03' });

    const restarted = createLocalBackend(storage, emptyGame);
    const state = await restarted.load();
    expect(state.logs).toEqual([climb]);
    expect(state.completed).toEqual(['vertical-read']);
    expect(state.flags).toEqual([
      { side: 'left', finger: 'index', date: '2026-10-03', spots: ['a2'] },
    ]);
    expect(state.reach?.armSpanCm).toBe(180);
  });

  it('keeps both changes when two arrive in the same tick', async () => {
    const storage = createMemoryStore();
    const backend = createLocalBackend(storage, emptyGame);
    await Promise.all([
      backend.addClimb(climb),
      backend.addClimb({ ...climb, id: 'c2' }),
    ]);
    const restarted = await createLocalBackend(storage, emptyGame).load();
    expect(restarted.logs.map(l => l.id)).toEqual(['c1', 'c2']);
  });

  it('loads flags saved before spots existed as "not sure where"', async () => {
    const storage = createMemoryStore();
    const flag = { side: 'right', finger: 'ring', date: '2026-10-01' };
    await storage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ ...emptyGame, flags: [flag] }),
    );
    const state = await createLocalBackend(storage, emptyGame).load();
    expect(state.flags).toEqual([{ ...flag, spots: [] }]);
  });

  it('falls back to the seed when saved data is unreadable', async () => {
    const storage = createMemoryStore();
    await storage.setItem(LOCAL_STORAGE_KEY, '{broken');
    expect(await createLocalBackend(storage, emptyGame).load()).toEqual(emptyGame);
  });

  it('resets the demo to the seed', async () => {
    const backend = createLocalBackend(createMemoryStore());
    await backend.removeClimb(sampleGame.logs[0].id);
    expect(await backend.resetDemo?.()).toEqual(sampleGame);
    expect(await backend.load()).toEqual(sampleGame);
  });
});
