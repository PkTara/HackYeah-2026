import type { ClimbLog, HandFlag, OnboardingResult } from '@hackyeah/core';
import { createMemoryStore, type KeyValueStore } from '@hackyeah/platform';
import { BackendError } from '../backend';
import { createBackend } from '../config';
import { API_TOKEN_KEY } from '../device';
import { createHttpBackend, type FetchLike } from '../http';
import { createFakeApi, type FakeApi } from '../testing/fakeApi';
import { fromQuestDto, type QuestDto } from '../wire';

const BASE = 'http://api.test';

function setup(
  opts: { storage?: KeyValueStore; api?: FakeApi; time?: string } = {},
) {
  const storage = opts.storage ?? createMemoryStore();
  const api = opts.api ?? createFakeApi();
  let now = new Date(opts.time ?? '2026-10-03T12:00:00Z');
  const backend = createHttpBackend({
    baseUrl: `${BASE}/`,
    storage,
    fetch: api.fetch,
    now: () => now,
  });
  const setTime = (iso: string) => {
    now = new Date(iso);
  };
  return { storage, api, backend, setTime };
}

/** "POST /v1/me/climbs" for every request so far. */
const requests = (api: FakeApi) => api.calls.map(c => `${c.method} ${c.path}`);
const bodiesTo = (api: FakeApi, path: string) =>
  api.calls
    .filter(c => c.method === 'POST' && c.path === path)
    .map(c => c.body);

const climb: ClimbLog = {
  id: 'app-1',
  date: '2026-10-02',
  terrain: 'overhang',
  movements: ['dynamic', 'controlled'],
  holds: ['crimp', 'sloper'],
  grade: 'V3',
  sent: false,
};

describe('identity', () => {
  it('makes one climber on first use and sends its token on every request', async () => {
    const { api, backend, storage } = setup();

    await backend.load();

    const token = await storage.getItem(API_TOKEN_KEY);
    expect(token).toBeTruthy();
    expect(api.calls[0]).toEqual({
      method: 'POST',
      path: '/v1/climbers',
      body: { name: 'Climber', goal: 'general' },
      token: null,
    });
    expect(requests(api).slice(1).sort()).toEqual([
      'GET /v1/me/assessments',
      'GET /v1/me/climbs',
      'GET /v1/me/hands',
      'GET /v1/me/quests',
      'POST /v1/me/quests',
    ]);
    expect(api.calls.slice(1).every(c => c.token === token)).toBe(true);
  });

  it('reuses the saved token after a restart', async () => {
    const first = setup();
    await first.backend.load();
    first.api.calls.length = 0;

    const { backend } = setup({ storage: first.storage, api: first.api });
    await backend.load();

    expect(requests(first.api)).not.toContain('POST /v1/climbers');
  });

  it('makes one new climber when the server forgot the token, and retries once', async () => {
    const { api, backend, storage } = setup();
    await backend.load();
    const old = await storage.getItem(API_TOKEN_KEY);
    api.reset();
    api.calls.length = 0;

    const state = await backend.load();

    const fresh = await storage.getItem(API_TOKEN_KEY);
    expect(fresh).toBeTruthy();
    expect(fresh).not.toBe(old);
    expect(requests(api).filter(r => r === 'POST /v1/climbers')).toHaveLength(
      1,
    );
    // The five requests of a load, each tried with the old token and then
    // once more with the new one.
    expect(api.calls.filter(c => c.token === old)).toHaveLength(5);
    expect(api.calls.filter(c => c.token === fresh)).toHaveLength(5);
    expect(state.assigned).not.toBeNull();
  });

  it('gives up when the new token is refused too', async () => {
    let made = 0;
    const fetch: FetchLike = async url =>
      url.endsWith('/v1/climbers')
        ? {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ token: `t${++made}` }),
          }
        : { ok: false, status: 401, text: async () => '' };
    const backend = createHttpBackend({
      baseUrl: BASE,
      storage: createMemoryStore(),
      fetch,
    });

    await expect(backend.addClimb(climb)).rejects.toMatchObject({
      status: 401,
    });
    expect(made).toBe(2);
  });
});

describe('climbs', () => {
  it('logs a climb with both styles and its holds, and loads it back', async () => {
    const { api, backend } = setup();

    await backend.addClimb(climb);

    expect(bodiesTo(api, '/v1/me/climbs')).toEqual([
      {
        terrain: 'overhang',
        movement: 'dynamic',
        movements: ['dynamic', 'controlled'],
        holds: ['crimp', 'sloper'],
        completed: false,
        grade: 'V3',
        grade_system: 'V',
        occurred_at: '2026-10-02T12:00:00Z',
      },
    ]);
    const { logs } = await backend.load();
    expect(logs).toEqual([{ ...climb, id: api.only().climbs[0].id }]);
  });

  it('reads climbs saved before the server kept both styles and holds', async () => {
    const { api, backend } = setup();
    await backend.load();
    api.only().climbs.push({
      id: 'old-1',
      occurred_at: '2026-09-30T12:00:00Z',
      terrain: 'slab',
      movement: 'controlled',
      completed: true,
      attempts: 2,
      grade: '6A',
      grade_system: 'font',
      location: null,
    });

    const { logs } = await backend.load();

    expect(logs).toEqual([
      {
        id: 'old-1',
        date: '2026-09-30',
        terrain: 'slab',
        movements: ['controlled'],
        holds: [],
        grade: '6A',
        sent: true,
      },
    ]);
  });

  it('deletes a climb logged a moment ago, by the id the server gave it', async () => {
    const api = createFakeApi({
      // The add is slow, so a delete sent alongside it would arrive first.
      delay: (method, path) =>
        method === 'POST' && path === '/v1/me/climbs' ? 20 : 0,
    });
    const { backend } = setup({ api });
    await backend.load();

    await Promise.all([backend.addClimb(climb), backend.removeClimb(climb.id)]);

    expect(api.only().climbs).toEqual([]);
    const [added, deleted] = requests(api).slice(-2);
    expect(added).toBe('POST /v1/me/climbs');
    expect(deleted).toMatch(/^DELETE \/v1\/me\/climbs\/climbs-\d+$/);
  });

  it('counts a climb the server no longer has as removed', async () => {
    const { api, backend } = setup();

    await expect(backend.removeClimb('gone')).resolves.toBeUndefined();
    expect(requests(api)).toContain('DELETE /v1/me/climbs/gone');
  });

  it('loads after the writes already made', async () => {
    const api = createFakeApi({
      delay: (method, path) =>
        method === 'POST' && path === '/v1/me/climbs' ? 20 : 0,
    });
    const { backend } = setup({ api });

    backend.addClimb(climb);
    const { logs } = await backend.load();

    expect(logs.map(l => l.grade)).toEqual(['V3']);
  });
});

describe('hand flags', () => {
  const ring: HandFlag = {
    side: 'right',
    finger: 'ring',
    date: '2026-10-01',
    spots: ['a2'],
  };

  it('sends a flag as a report without a rating, and a clear as pain 0', async () => {
    const { api, backend, setTime } = setup({ time: '2026-10-01T12:00:00Z' });

    await backend.setHandFlag(ring, true);
    setTime('2026-10-02T12:00:00Z');
    await backend.setHandFlag(ring, false);

    expect(bodiesTo(api, '/v1/me/hands')).toEqual([
      {
        side: 'right',
        region: 'ring_finger',
        pain: null,
        spots: ['a2'],
        occurred_at: '2026-10-01T12:00:00.000Z',
      },
      {
        side: 'right',
        region: 'ring_finger',
        pain: 0,
        occurred_at: '2026-10-02T12:00:00.000Z',
      },
    ]);
  });

  it('keeps the first date when the spots change, and drops a cleared flag', async () => {
    const { backend, setTime } = setup({ time: '2026-10-01T12:00:00Z' });

    await backend.setHandFlag(ring, true);
    setTime('2026-10-02T12:00:00Z');
    await backend.setHandFlag({ ...ring, spots: ['a2', 'pip'] }, true);

    expect((await backend.load()).flags).toEqual([
      { ...ring, date: '2026-10-01', spots: ['a2', 'pip'] },
    ]);
    setTime('2026-10-03T12:00:00Z');
    await backend.setHandFlag(ring, false);
    expect((await backend.load()).flags).toEqual([]);
  });

  it('reads the report history as the current flags', async () => {
    const { api, backend } = setup();
    await backend.load();
    let n = 0;
    const report = (
      day: number,
      side: 'left' | 'right',
      region: string,
      pain: number | null,
      spots?: string[],
    ) => ({
      id: `r${++n}`,
      occurred_at: `2026-10-0${day}T12:00:00Z`,
      side,
      region,
      pain,
      note: '',
      ...(spots ? { spots } : {}),
    });
    api.only().hands.push(
      // Rated sore, cleared, then sore again: dated from the new run.
      report(1, 'left', 'index_finger', 3, []),
      report(2, 'left', 'index_finger', 0, []),
      report(3, 'left', 'index_finger', 2), // an older report with no spots
      // Sore, then cleared.
      report(1, 'left', 'middle_finger', null, ['pip']),
      report(3, 'left', 'middle_finger', 0, []),
      // Sore since the 2nd, spots edited on the 3rd.
      report(2, 'right', 'ring_finger', null, ['a2']),
      report(3, 'right', 'ring_finger', null, ['a2', 'a3']),
      // Not a finger: not shown yet.
      report(2, 'right', 'palm', 5, []),
    );

    const { flags } = await backend.load();

    expect(flags).toEqual([
      {
        side: 'right',
        finger: 'ring',
        date: '2026-10-02',
        spots: ['a2', 'a3'],
      },
      { side: 'left', finger: 'index', date: '2026-10-03', spots: [] },
    ]);
  });
});

describe('reach', () => {
  it('saves height and arm span as two measurements, and loads them back', async () => {
    const { api, backend } = setup();

    await backend.saveReach({
      armSpanCm: 181,
      heightCm: 178,
      date: '2026-10-03',
    });

    const measured = {
      unit: 'cm',
      method: 'manual',
      protocol: 'self-measured-v1',
      occurred_at: '2026-10-03T12:00:00.000Z',
    };
    expect(bodiesTo(api, '/v1/me/assessments')).toEqual([
      { metric: 'height', value: 178, ...measured },
      { metric: 'arm_span', value: 181, ...measured },
    ]);
    expect((await backend.load()).reach).toEqual({
      armSpanCm: 181,
      heightCm: 178,
      date: '2026-10-03',
    });
  });

  it('has no reach until both are measured', async () => {
    const { api, backend } = setup();
    await backend.load();
    api.only().assessments.push({
      id: 'a1',
      metric: 'height',
      value: 170,
      unit: 'cm',
      method: 'manual',
      protocol: 'self-measured-v1',
      occurred_at: '2026-10-01T12:00:00Z',
    });

    expect((await backend.load()).reach).toBeNull();
  });
});

describe('quests', () => {
  const checkin = {
    kind: 'recovery_checkin',
    title: 'Check in with your hands',
    instructions: 'Record how your hand feels today.',
    reason: 'Current hand discomfort was reported.',
    estimated_minutes: 1,
  };

  it('shows the quest the server assigned, the same one on every load', async () => {
    const { api, backend } = setup();
    api.queueQuests(checkin);

    const state = await backend.load();

    expect(state.assigned).toEqual({
      id: expect.any(String),
      kind: 'checkin',
      title: 'Check in with your hands',
      task: 'Record how your hand feels today.',
      why: 'Current hand discomfort was reported.',
      minutes: 1,
      equipment: 'None',
      loadsFingers: false,
    });
    expect((await backend.load()).assigned?.id).toBe(state.assigned?.id);
  });

  it('maps each server quest kind to the closest app kind', () => {
    const dto = (kind: string): QuestDto => ({
      id: 'q',
      status: 'assigned',
      kind,
      title: 'Title',
      instructions: 'Task',
      reason: 'Why',
      estimated_minutes: 2,
      evidence_ids: [],
    });
    const kinds = [
      'recovery_checkin',
      'reflect_climb',
      'record_assessment',
      'something_new',
    ].map(kind => fromQuestDto(dto(kind)).kind);
    expect(kinds).toEqual(['checkin', 'plan', 'assess', 'plan']);
  });

  it('completes a quest and answers with the next one', async () => {
    const { api, backend } = setup();
    api.queueQuests(checkin);
    const first = (await backend.load()).assigned!.id;

    const after = await backend.completeQuest(first);

    expect(requests(api)).toContain(`POST /v1/me/quests/${first}/complete`);
    expect(after).toMatchObject({ completed: [first], skipped: [] });
    expect(after?.assigned).toMatchObject({ kind: 'assess' });
    expect(after?.assigned?.id).not.toBe(first);
  });

  it('skips a quest and answers with the next one', async () => {
    const { api, backend } = setup();
    api.queueQuests(checkin);
    const first = (await backend.load()).assigned!.id;

    const after = await backend.skipQuest(first);

    expect(requests(api)).toContain(`POST /v1/me/quests/${first}/skip`);
    expect(after).toMatchObject({ completed: [], skipped: [first] });
    expect(after?.assigned?.id).not.toBe(first);
  });

  it('answers a quest that no longer fits with the fresh state, not an error', async () => {
    const { api, backend } = setup();
    const first = (await backend.load()).assigned!.id;
    api.markStale(first);

    const after = await backend.completeQuest(first);

    expect(after?.completed).toEqual([]);
    expect(after?.assigned?.id).not.toBe(first);
  });
});

describe('setup and home tests', () => {
  const result: OnboardingResult = {
    version: 1,
    date: '2026-10-03',
    details: {
      places: ['bouldering-gym'],
      experience: '6-to-24-months',
      grade: 'V3',
      goal: 'injury-free',
      body: { heightCm: 178, armSpanCm: 181 },
    },
    connections: [{ id: 'strava', choice: 'declined' }],
    baseline: [
      {
        testId: 'dead-hang',
        value: 32,
        unit: 'seconds',
        method: 'stopwatch',
        date: '2026-10-03',
      },
      {
        testId: 'pull-ups',
        value: 6,
        unit: 'reps',
        method: 'counter',
        date: '2026-10-03',
      },
      {
        testId: 'plank',
        value: 75,
        unit: 'seconds',
        method: 'stopwatch',
        date: '2026-10-03',
      },
    ],
    skippedTests: ['sit-and-reach', 'one-leg-balance', 'push-ups'],
  };

  it('keeps the answers on the device and sends what the server has a place for', async () => {
    const { api, backend, storage } = setup();

    await backend.finishOnboarding(result);

    expect(api.calls.find(c => c.method === 'PATCH')).toMatchObject({
      path: '/v1/me',
      body: { goal: 'mobility' },
    });
    const sent = bodiesTo(api, '/v1/me/assessments').map(b => [
      b?.metric,
      b?.value,
      b?.unit,
      b?.method,
      b?.protocol,
    ]);
    expect(sent).toEqual([
      ['height', 178, 'cm', 'manual', 'self-measured-v1'],
      ['arm_span', 181, 'cm', 'manual', 'self-measured-v1'],
      ['hang_duration', 32, 'seconds', 'manual', 'dead-hang-v1'],
      ['pullups', 6, 'repetitions', 'manual', 'pull-ups-v1'],
    ]);
    expect(await backend.load()).toMatchObject({
      onboarding: result,
      onboardingSkipped: false,
      baseline: result.baseline,
      reach: { heightCm: 178, armSpanCm: 181, date: '2026-10-03' },
    });
    // Another start on this device reads the same answers.
    const restarted = setup({ storage, api }).backend;
    expect((await restarted.load()).onboarding).toEqual(result);
  });

  it('remembers a skipped setup on the device only', async () => {
    const { api, backend } = setup();

    await backend.skipOnboarding();

    expect(api.calls).toEqual([]);
    expect(await backend.load()).toMatchObject({
      onboarding: null,
      onboardingSkipped: true,
    });
  });

  it('replaces one home test result, and sends it when the server has a metric', async () => {
    const { api, backend } = setup();
    await backend.finishOnboarding(result);
    api.calls.length = 0;

    await backend.saveBaseline({
      testId: 'pull-ups',
      value: 8,
      unit: 'reps',
      method: 'counter',
      date: '2026-10-04',
    });
    await backend.saveBaseline({
      testId: 'push-ups',
      value: 20,
      unit: 'reps',
      method: 'counter',
      date: '2026-10-04',
    });

    expect(bodiesTo(api, '/v1/me/assessments')).toEqual([
      {
        metric: 'pullups',
        value: 8,
        unit: 'repetitions',
        method: 'manual',
        protocol: 'pull-ups-v1',
        occurred_at: '2026-10-03T12:00:00.000Z',
      },
    ]);
    const { baseline } = await backend.load();
    expect(baseline.map(r => [r.testId, r.value])).toEqual([
      ['dead-hang', 32],
      ['pull-ups', 8],
      ['plank', 75],
      ['push-ups', 20],
    ]);
  });
});

describe('errors', () => {
  it('turns HTTP errors and network failures into BackendError', async () => {
    const { api, backend } = setup();
    await backend.load();

    await expect(backend.completeQuest('missing')).rejects.toMatchObject({
      status: 404,
    });
    api.setOffline(true);
    await expect(backend.load()).rejects.toBeInstanceOf(BackendError);
    await expect(backend.load()).rejects.toMatchObject({ status: 0 });
  });

  it('keeps going after a write that failed', async () => {
    const { api, backend } = setup();
    api.setOffline(true);
    await expect(backend.addClimb(climb)).rejects.toMatchObject({ status: 0 });

    api.setOffline(false);
    await backend.addClimb({ ...climb, id: 'app-2' });

    expect(api.only().climbs).toHaveLength(1);
  });

  it('rejects an answer in the wrong shape instead of showing a blank profile', async () => {
    const fetch: FetchLike = async url => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify(
          url.endsWith('/v1/climbers') ? { token: 't' } : { climbs: 'nope' },
        ),
    });
    const backend = createHttpBackend({
      baseUrl: BASE,
      storage: createMemoryStore(),
      fetch,
    });

    await expect(backend.load()).rejects.toBeInstanceOf(BackendError);
  });

  it('has no demo reset: the server keeps the real records', () => {
    expect(setup().backend.resetDemo).toBeUndefined();
  });
});

describe('createBackend', () => {
  it('talks to the API when a URL is set, otherwise keeps data on the device', () => {
    const storage = createMemoryStore();
    expect(
      createBackend(storage, { apiBaseUrl: 'http://127.0.0.1:8000' }).kind,
    ).toBe('remote');
    expect(createBackend(storage, { apiBaseUrl: ' ' }).kind).toBe('local');
    expect(createBackend(storage).kind).toBe('local');
  });
});
