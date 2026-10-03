import { BackendError } from '../backend';
import { createHttpBackend, type FetchLike } from '../http';
import type { ProfileDto } from '../wire';

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };

/** A fake server: records requests and answers with a fixed status and body. */
function fakeFetch(status = 200, answer: unknown = null) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (answer === null ? '' : JSON.stringify(answer)),
    };
  };
  return { fetch, calls };
}

const profile: ProfileDto = {
  climbs: [
    {
      id: 'c1',
      date: '2026-10-01',
      terrain: 'slab',
      movements: ['controlled', 'dynamic'],
      holds: ['crimp', 'sloper'],
      grade: 'V2',
      sent: true,
    },
  ],
  hand_flags: [{ side: 'right', finger: 'ring', date: '2026-10-02', spots: ['a2', 'pip'] }],
  completed_quest_ids: ['q1'],
  skipped_quest_ids: [],
  reach: { arm_span_cm: 181, height_cm: 178, date: '2026-09-30' },
};

describe('http backend', () => {
  it('loads the profile and maps it to app state', async () => {
    const { fetch, calls } = fakeFetch(200, profile);
    const backend = createHttpBackend({ baseUrl: 'https://api.test/v1/', fetch });

    const state = await backend.load();

    expect(calls[0]).toMatchObject({ method: 'GET', url: 'https://api.test/v1/me/profile' });
    expect(state.logs[0]).toEqual(profile.climbs[0]);
    expect(state.flags).toEqual(profile.hand_flags);
    expect(state.completed).toEqual(['q1']);
    expect(state.reach).toEqual({ armSpanCm: 181, heightCm: 178, date: '2026-09-30' });
  });

  it('sends each command to its endpoint with the right body', async () => {
    const { fetch, calls } = fakeFetch(204);
    const backend = createHttpBackend({
      baseUrl: 'https://api.test/v1',
      fetch,
      getAuthToken: () => 'token-123',
    });
    const flag = { side: 'left', finger: 'index', date: '2026-10-03', spots: ['a2'] } as const;

    await backend.addClimb({ ...profile.climbs[0], sample: true });
    await backend.completeQuest('vertical-read');
    await backend.setHandFlag(flag, true);
    await backend.setHandFlag(flag, false);
    await backend.saveReach({ armSpanCm: 180, heightCm: 176, date: '2026-10-03' });
    await backend.removeClimb('c1');

    expect(calls.map(c => `${c.method} ${c.url.replace('https://api.test/v1', '')}`)).toEqual([
      'POST /me/climbs',
      'POST /me/quests/vertical-read/complete',
      'PUT /me/hand-flags/left/index',
      'DELETE /me/hand-flags/left/index',
      'PUT /me/reach',
      'DELETE /me/climbs/c1',
    ]);
    // The sample marker is app-only and never sent.
    expect(calls[0].body).toEqual(profile.climbs[0]);
    expect(calls[2].body).toEqual(flag);
    expect(calls[3].body).toBeUndefined();
    expect(calls[4].body).toEqual({ arm_span_cm: 180, height_cm: 176, date: '2026-10-03' });
    expect(calls.every(c => c.headers.Authorization === 'Bearer token-123')).toBe(true);
  });

  it('reads climbs from a server that still sends a single movement', async () => {
    const { climbs, ...rest } = profile;
    const older = {
      ...rest,
      climbs: climbs.map(({ movements, holds, ...c }) => ({ ...c, movement: movements[0] })),
    };
    const backend = createHttpBackend({
      baseUrl: 'https://api.test',
      fetch: fakeFetch(200, older).fetch,
    });

    const state = await backend.load();

    expect(state.logs[0]).toMatchObject({ movements: ['controlled'], holds: [] });
  });

  it('reads flags from a server that does not send spots yet as "not sure where"', async () => {
    const older = {
      ...profile,
      hand_flags: [{ side: 'right', finger: 'ring', date: '2026-10-02' }],
    };
    const backend = createHttpBackend({
      baseUrl: 'https://api.test',
      fetch: fakeFetch(200, older).fetch,
    });

    const state = await backend.load();

    expect(state.flags).toEqual([
      { side: 'right', finger: 'ring', date: '2026-10-02', spots: [] },
    ]);
  });

  it('turns HTTP errors and network failures into BackendError', async () => {
    const failing = createHttpBackend({ baseUrl: 'https://api.test', fetch: fakeFetch(500).fetch });
    await expect(failing.completeQuest('q')).rejects.toMatchObject({ status: 500 });

    const offline = createHttpBackend({
      baseUrl: 'https://api.test',
      fetch: async () => {
        throw new Error('network down');
      },
    });
    await expect(offline.load()).rejects.toBeInstanceOf(BackendError);
    await expect(offline.load()).rejects.toMatchObject({ status: 0 });
  });

  it('rejects a profile in the wrong shape instead of showing a blank one', async () => {
    const backend = createHttpBackend({
      baseUrl: 'https://api.test',
      fetch: fakeFetch(200, { climbs: 'nope' }).fetch,
    });
    await expect(backend.load()).rejects.toBeInstanceOf(BackendError);
  });
});
