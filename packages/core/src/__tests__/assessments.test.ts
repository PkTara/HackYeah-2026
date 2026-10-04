import {
  emptyGame,
  gameReducer,
  parseGameState,
  comparableAssessments,
  type AssessmentRecord,
} from '../index';

const record: AssessmentRecord = {
  id: 'force-1',
  metric: 'finger_force',
  value: 400,
  unit: 'N',
  method: 'manual',
  protocol: 'instrument-finger-force-v1',
  occurredAt: '2026-10-04T10:00:00Z',
  side: 'left',
  setup: {
    instrument: 'Load cell',
    grip: 'half_crimp',
    edge_mm: 20,
    arm_position: 'straight',
    effort_seconds: 5,
  },
};

it('retains each assessment in history', () => {
  const first = gameReducer(emptyGame, { type: 'saveAssessment', record });
  const second = gameReducer(first, {
    type: 'saveAssessment',
    record: { ...record, id: 'force-2', value: 410 },
  });
  expect(second.assessments).toEqual([
    record,
    { ...record, id: 'force-2', value: 410 },
  ]);
});

it('migrates legacy saved profiles to empty assessment history', () => {
  expect(
    parseGameState(JSON.stringify({ ...emptyGame, assessments: undefined }))
      ?.assessments,
  ).toEqual([]);
});

it('drops invalid saved assessment readings while preserving valid force setup', () => {
  const assessments = [
    record,
    { ...record, value: -1 },
    { ...record, unit: 'seconds' },
    { ...record, setup: undefined },
    { ...record, occurredAt: 'not a date' },
  ];
  expect(
    parseGameState(JSON.stringify({ ...emptyGame, assessments }))?.assessments,
  ).toEqual([record]);
});

it('does not duplicate a reading when a save is retried', () => {
  const first = gameReducer(emptyGame, { type: 'saveAssessment', record });
  expect(
    gameReducer(first, { type: 'saveAssessment', record }).assessments,
  ).toEqual([record]);
});

it('compares a latest reading only with the same conditions and simulation provenance', () => {
  const previous = {
    ...record,
    id: 'previous',
    occurredAt: '2026-10-03T10:00:00Z',
    value: 390,
  };
  const mismatch = [
    { ...previous, id: 'right', side: 'right' as const },
    { ...previous, id: 'kgf', unit: 'kgf' as const },
    { ...previous, id: 'protocol', protocol: 'other-v1' },
    { ...previous, id: 'simulation', simulated: true },
    { ...previous, id: 'setup', setup: { ...record.setup!, edge_mm: 25 } },
    { ...previous, id: 'method', method: 'camera' as const },
  ];
  const compared = comparableAssessments([record, previous, ...mismatch]);
  expect(compared.find(c => c.latest.id === record.id)).toEqual({
    latest: record,
    previous,
    change: 10,
  });
  expect(compared).toHaveLength(7);
});

it('rejects invalid camera geometry or confidence when loading saved evidence', () => {
  const camera: AssessmentRecord = {
    id: 'camera',
    metric: 'shoulder_reach_left',
    value: 170,
    unit: 'degrees',
    method: 'camera',
    confidence: 0.9,
    protocol: 'front-facing-overhead-reach-v1',
    occurredAt: record.occurredAt,
    side: 'left',
  };
  const assessments = [
    camera,
    { ...camera, value: 181 },
    { ...camera, confidence: 0.2 },
    { ...camera, confidence: undefined },
    { ...camera, side: 'right' },
  ];
  expect(
    parseGameState(JSON.stringify({ ...emptyGame, assessments }))?.assessments,
  ).toEqual([camera]);
});

it('allows a 120-character instrument but rejects one longer than the API limit', () => {
  const boundary = {
    ...record,
    setup: { ...record.setup!, instrument: 'x'.repeat(120) },
  };
  const over = {
    ...record,
    setup: { ...record.setup!, instrument: 'x'.repeat(121) },
  };
  expect(
    parseGameState(
      JSON.stringify({ ...emptyGame, assessments: [boundary, over] }),
    )?.assessments,
  ).toEqual([boundary]);
});

it('keeps reviewed snapshots and legacy records but rejects malformed stored decision metadata', () => {
  const decision = {
    summary: 'Saved estimate',
    status: 'estimate' as const,
    rule: 'camera-v1',
    evidence: [{ id: 'landmark-11', label: 'Left shoulder', detail: 'x=0.4' }],
    sourceIds: ['barzegar2024'],
    limitations: ['Client-supplied report'],
  };
  const saved = { ...record, decision };
  expect(
    parseGameState(
      JSON.stringify({
        ...emptyGame,
        assessments: [
          record,
          saved,
          { ...saved, decision: { ...decision, evidence: [{ id: 11 }] } },
        ],
      }),
    )?.assessments,
  ).toEqual([record, saved]);
});
