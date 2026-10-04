import { emptyGame, type AssessmentRecord } from '@hackyeah/core';
import { createMemoryStore } from '@hackyeah/platform';
import { createLocalBackend } from '../local';
import { createHttpBackend } from '../http';
import { createFakeApi } from '../testing/fakeApi';

const record: AssessmentRecord = {
  id: 'force-1',
  metric: 'finger_force',
  value: 400,
  unit: 'N',
  method: 'manual',
  protocol: 'instrument-finger-force-v1',
  occurredAt: '2026-10-04T10:00:00Z',
  side: 'left',
  simulated: true,
  setup: {
    instrument: 'Load cell',
    grip: 'half_crimp',
    edge_mm: 20,
    arm_position: 'straight',
    effort_seconds: 5,
  },
};

it('persists instrument readings and setup through a local restart', async () => {
  const storage = createMemoryStore();
  await createLocalBackend(storage, emptyGame).saveAssessment(record);
  expect(
    (await createLocalBackend(storage, emptyGame).load()).assessments,
  ).toEqual([record]);
});

it('sends force setup and returns server history without changing the measurement timestamp', async () => {
  const api = createFakeApi();
  const storage = createMemoryStore();
  const backend = createHttpBackend({
    baseUrl: 'http://api.test',
    storage,
    fetch: api.fetch,
  });
  await backend.saveAssessment(record);
  const body = api.calls.find(
    c => c.path === '/v1/me/assessments' && c.method === 'POST',
  )?.body;
  expect(body).toEqual({
    metric: 'finger_force',
    value: 400,
    unit: 'N',
    method: 'manual',
    protocol: record.protocol,
    occurred_at: record.occurredAt,
    side: 'left',
    setup: record.setup,
    simulated: true,
  });
  const restarted = createHttpBackend({
    baseUrl: 'http://api.test',
    storage,
    fetch: api.fetch,
  });
  expect((await restarted.load()).assessments).toEqual([
    { ...record, id: api.only().assessments[0].id },
  ]);
});

it('keeps camera leg and both shoulder-side readings in local and remote history', async () => {
  const records: AssessmentRecord[] = [
    'leg_spread',
    'shoulder_reach_left',
    'shoulder_reach_right',
  ].map((metric, i) => ({
    id: `camera-${i}`,
    metric: metric as AssessmentRecord['metric'],
    value: 150 + i,
    unit: 'degrees',
    method: 'camera',
    protocol:
      metric === 'leg_spread'
        ? 'front-facing-leg-spread-v1'
        : 'front-facing-overhead-reach-v1',
    occurredAt: '2026-10-04T10:01:00Z',
    confidence: 0.9,
    modelVersion: 'pose-v1',
    simulated: false,
  }));
  const api = createFakeApi();
  const local = createLocalBackend(createMemoryStore(), emptyGame);
  const remote = createHttpBackend({
    baseUrl: 'http://api.test',
    storage: createMemoryStore(),
    fetch: api.fetch,
  });
  for (const backend of [local, remote]) {
    for (const reading of records) {
      await backend.saveAssessment(reading);
    }
    expect(
      (await backend.load()).assessments?.map(
        ({ id: _id, ...reading }) => reading,
      ),
    ).toEqual(records.map(({ id: _id, ...reading }) => reading));
    expect((await backend.resetProfile()).assessments).toEqual([]);
    expect((await backend.load()).assessments).toEqual([]);
  }
});

it('rejects invalid instrument records on device without adding them to history', async () => {
  const backend = createLocalBackend(createMemoryStore(), emptyGame);
  await expect(
    backend.saveAssessment({ ...record, value: -1 }),
  ).rejects.toThrow('Invalid assessment');
  expect((await backend.load()).assessments).toEqual([]);
});

it('retries a partially saved shoulder pair without reposting the acknowledged side', async () => {
  const api = createFakeApi();
  let rejectRight = true;
  const backend = createHttpBackend({
    baseUrl: 'http://api.test',
    storage: createMemoryStore(),
    fetch: async (url, init) => {
      const body = init.body ? JSON.parse(init.body) : null;
      if (
        init.method === 'POST' &&
        url.endsWith('/v1/me/assessments') &&
        body?.metric === 'shoulder_reach_right' &&
        rejectRight
      ) {
        rejectRight = false;
        throw new Error('network down');
      }
      return api.fetch(url, init);
    },
  });
  const pair: AssessmentRecord[] = ['left', 'right'].map(side => ({
    id: `shoulder-${side}`,
    metric: `shoulder_reach_${side}` as AssessmentRecord['metric'],
    value: 170,
    unit: 'degrees',
    method: 'camera',
    confidence: 0.9,
    protocol: 'front-facing-overhead-reach-v1',
    occurredAt: record.occurredAt,
  }));
  const savePair = async () => {
    for (const reading of pair) {
      await backend.saveAssessment(reading);
    }
  };
  await expect(savePair()).rejects.toMatchObject({ status: 0 });
  expect(api.only().assessments.map(a => a.metric)).toEqual([
    'shoulder_reach_left',
  ]);
  await savePair();
  expect(api.only().assessments.map(a => a.metric)).toEqual([
    'shoulder_reach_left',
    'shoulder_reach_right',
  ]);
  expect((await backend.load()).assessments).toHaveLength(2);
});

it('keeps failed storage writes out of the local cache and allows a later retry', async () => {
  const storage = createMemoryStore();
  let diskFull = true;
  const backend = createLocalBackend(
    {
      ...storage,
      setItem: async (key, value) => {
        if (diskFull) {
          throw new Error('disk full');
        }
        await storage.setItem(key, value);
      },
    },
    emptyGame,
  );
  await expect(backend.saveAssessment(record)).rejects.toThrow('disk full');
  expect((await backend.load()).assessments).toEqual([]);
  expect(
    (await createLocalBackend(storage, emptyGame).load()).assessments,
  ).toEqual([]);
  diskFull = false;
  await backend.saveAssessment(record);
  expect(
    (await createLocalBackend(storage, emptyGame).load()).assessments,
  ).toEqual([record]);
});

it('clears acknowledged assessment ids after resetting the HTTP profile', async () => {
  const api = createFakeApi();
  const backend = createHttpBackend({
    baseUrl: 'http://api.test',
    storage: createMemoryStore(),
    fetch: api.fetch,
  });
  await backend.saveAssessment(record);
  await backend.saveAssessment(record);
  expect(api.only().assessments).toHaveLength(1);
  await backend.resetProfile();
  await backend.saveAssessment(record);
  expect(api.only().assessments).toHaveLength(1);
});

it('preserves reviewed camera decision snapshots through remote save and restart', async () => {
  const decision = {
    summary: 'Left shoulder 170 degrees',
    status: 'estimate' as const,
    rule: 'camera-shoulder-reach-v1',
    evidence: [
      {
        id: 'landmark-11',
        label: 'Left shoulder',
        detail: '{"x":0.4,"y":0.5,"visibility":0.9}',
      },
    ],
    sourceIds: ['barzegar2024'],
    limitations: ['Model/version unavailable'],
  };
  const camera: AssessmentRecord = {
    id: 'camera-reviewed',
    metric: 'shoulder_reach_left',
    value: 170,
    unit: 'degrees',
    method: 'camera',
    protocol: 'front-facing-overhead-reach-v1',
    confidence: 0.9,
    occurredAt: record.occurredAt,
    decision,
  };
  const api = createFakeApi();
  const storage = createMemoryStore();
  const backend = createHttpBackend({
    baseUrl: 'http://api.test',
    storage,
    fetch: api.fetch,
  });
  await backend.saveAssessment(camera);
  const body = api.calls.find(
    c => c.path === '/v1/me/assessments' && c.method === 'POST',
  )?.body;
  const { sourceIds, ...snapshot } = decision;
  expect(body).toMatchObject({
    decision: { ...snapshot, source_ids: sourceIds },
  });
  expect(body).not.toHaveProperty('decision.sourceIds');
  const restarted = createHttpBackend({
    baseUrl: 'http://api.test',
    storage,
    fetch: api.fetch,
  });
  expect((await restarted.load()).assessments?.[0].decision).toEqual(decision);
});
