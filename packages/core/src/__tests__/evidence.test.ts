import {
  explainFocus,
  explainPause,
  explainQuest,
  explainTerrain,
  explainMovement,
  explainCamera,
  RESEARCH_SOURCES,
  findQuest,
  pickFocus,
  pickQuest,
  type ClimbLog,
} from '..';
const logs: ClimbLog[] = [
  {
    id: 'climb-1',
    date: '2026-10-03',
    terrain: 'slab',
    movements: ['dynamic'],
    holds: ['crimp'],
    grade: 'V3',
    sent: false,
  },
];
it('explains local focus using dated logs and all terrain comparisons', () => {
  const explanation = explainFocus(pickFocus(logs), logs);
  expect(explanation.evidence).toEqual([
    {
      id: 'climb-1',
      label: 'Climb · 2026-10-03',
      detail: 'slab; movements=dynamic; holds=crimp; grade=V3; sent=false',
    },
  ]);
  expect(explanation.rule).toContain('vertical: 0/0');
  expect(explanation.rule).toContain('slab: 0/1');
  expect(explanation.rule).toContain('3');
  expect(explanation.limitations.join(' ')).toMatch(/product/);
});

it('explains finger-loading pauses from dated user flags without diagnosing safety', () => {
  const explanation = explainPause([
    { side: 'left', finger: 'ring', date: '2026-10-02', spots: ['a2'] },
  ]);
  expect(explanation.evidence[0]).toEqual({
    id: 'left/ring',
    label: 'Hand flag · 2026-10-02',
    detail: 'left ring; reported sore; spots=a2',
  });
  expect(explanation.rule).toContain('loadsFingers');
  expect(explanation.limitations.join(' ')).toContain('diagnosis');
});

it('labels local drills and their doses as draft product choices', () => {
  const explanation = explainQuest(
    findQuest('vertical-quiet-feet')!,
    pickFocus(logs),
    logs,
    [],
  );
  expect(explanation.status).toBe('draft');
  expect(explanation.rule).toContain('15 minutes');
  expect(explanation.rule).toContain('4 easy');
  expect(explanation.limitations.join(' ')).toContain('direct research');
  expect(explanation.evidence.map(entry => entry.id)).toContain('climb-1');
});

it('uses authoritative server snapshots and reports unknown quest provenance', () => {
  const local = findQuest('vertical-read')!;
  const decision = {
    summary: 'Server choice',
    status: 'app_rule' as const,
    rule: 'server-only-rule',
    evidence: [
      { id: 'old-record', label: '2026-10-01', detail: 'completed=false' },
    ],
    sourceIds: [],
    limitations: ['Snapshot at assignment'],
  };
  expect(
    explainQuest(
      { ...local, id: 'server-id', decision },
      pickFocus(logs),
      logs,
      [],
    ),
  ).toBe(decision);
  const unknown = explainQuest(
    { ...local, id: 'legacy-server-id' },
    pickFocus(logs),
    logs,
    [],
  );
  expect(unknown.rule).toMatch(/unavailable/i);
  expect(unknown.evidence).toEqual([]);
});

it('explains terrain counts with matching records and hides the rate below the product threshold', () => {
  const explanation = explainTerrain('slab', logs);
  expect(explanation.summary).toContain('0 of 1');
  expect(explanation.evidence.map(entry => entry.id)).toEqual(['climb-1']);
  expect(explanation.rule).toContain('fewer than 3');
  expect(explanation.rule).toContain('not assessed');
});

it('explains movement counts including multi-style logs once per selected movement', () => {
  const both = { ...logs[0], movements: ['dynamic', 'controlled'] as const };
  const explanation = explainMovement('controlled', [both]);
  expect(explanation.summary).toContain('0 of 1');
  expect(explanation.evidence.map(entry => entry.id)).toEqual(['climb-1']);
  expect(explanation.rule).toContain('both');
});

it('explains camera geometry and visibility without claiming validated range or complete provenance', () => {
  const explanation = explainCamera({
    value: 82.4,
    confidence: 0.9,
    protocol: 'front-facing-leg-spread-v1',
    method: 'camera',
    modelVersion: 'v1',
  });
  expect(explanation.status).toBe('estimate');
  expect(explanation.rule).toContain('hip midpoint');
  expect(explanation.evidence.map(entry => entry.detail).join(' ')).toContain(
    '82.4',
  );
  expect(explanation.evidence.map(entry => entry.detail).join(' ')).toContain(
    'v1',
  );
  expect(explanation.limitations.join(' ')).toContain('visibility');
  expect(explanation.limitations.join(' ')).toContain('coordinates');
  expect(explanation.limitations.join(' ')).toContain('unavailable');
});

it('provides original research links and explicit reading depth and limitations for all scoped sources', () => {
  expect(RESEARCH_SOURCES).toHaveLength(17);
  expect(new Set(RESEARCH_SOURCES.map(source => source.id)).size).toBe(17);
  for (const source of RESEARCH_SOURCES) {
    expect(source.url).toMatch(/^https:\/\/doi.org\//);
    expect(source.readingDepth).toBeTruthy();
    expect(source.limitations.length).toBeGreaterThan(0);
    expect(source.population).toBeTruthy();
    expect(source.verifiedAt).toMatch(/^2026-10-0[34]$/);
  }
  expect(
    RESEARCH_SOURCES.find(source => source.id === 'paxton2012')?.population,
  ).toContain('no human');
});

it('shows completed and skip-order inputs when supplied for local quest selection', () => {
  const explanation = explainQuest(
    findQuest('vertical-read')!,
    pickFocus(logs),
    logs,
    [],
    { completed: ['done-id'], skipped: ['skip-first', 'skip-last'] },
  );
  expect(explanation.evidence).toContainEqual({
    id: 'quest-selection',
    label: 'Current quest controls',
    detail: 'completed=done-id; skipped oldest-first=skip-first,skip-last',
  });
  expect(explanation.rule).not.toContain('IDs are unavailable');
});

it('uses authoritative camera landmark snapshots instead of reconstructing inputs from the result', () => {
  const decision = {
    summary: '90 degrees',
    status: 'estimate' as const,
    rule: 'server-camera-v1',
    evidence: [
      {
        id: 'landmark-23',
        label: 'Left hip',
        detail: 'x=0.45,y=0.25,visibility=0.9',
      },
    ],
    sourceIds: ['stenum2021'],
    limitations: ['model/version unavailable'],
  };
  expect(explainCamera({ value: 90, decision })).toBe(decision);
});

it('resolves the Schweizer source ID to its complete parenthesized DOI link', () => {
  const source = RESEARCH_SOURCES.find(entry => entry.id === 'schweizer2001');
  expect(source?.url).toBe('https://doi.org/10.1016/S0021-9290(00)00184-6');
});

it('explains the real flagged check-in priority, skip ordering and library ties', () => {
  const comparisonLogs: ClimbLog[] = (
    ['slab', 'vertical', 'overhang'] as const
  ).flatMap(terrain =>
    [0, 1, 2].map(index => ({
      ...logs[0],
      id: `${terrain}-${index}`,
      terrain,
      sent: terrain !== 'vertical',
    })),
  );
  const focus = pickFocus(comparisonLogs);
  expect(focus).toMatchObject({ kind: 'practice', terrain: 'vertical' });
  const flags = [
    {
      side: 'left' as const,
      finger: 'ring' as const,
      date: '2026-10-03',
      spots: [],
    },
  ];
  const initial = { completed: [], skipped: [] };
  const checkin = pickQuest(focus, { ...initial, hasFlag: true }).quest!;
  expect(checkin.id).toBe('finger-checkin');
  const initialExplanation = explainQuest(
    checkin,
    focus,
    comparisonLogs,
    flags,
    initial,
  );
  expect(initialExplanation.rule).toContain(
    'needsFlag check-in priority within the same skip rank',
  );
  expect(initialExplanation.rule).toContain('unskipped before skipped');
  expect(initialExplanation.rule).toContain('skipped oldest-first');
  expect(initialExplanation.rule).toContain(
    'library order breaks remaining ties',
  );
  expect(initialExplanation.evidence).toContainEqual({
    id: 'quest-selection',
    label: 'Current quest controls',
    detail: 'completed=none; skipped oldest-first=none',
  });
  expect(initialExplanation.evidence).toContainEqual({
    id: 'left/ring',
    label: 'Hand flag · 2026-10-03',
    detail: 'left ring; reported sore; spots=not specified',
  });

  const skippedCheckin = { completed: [], skipped: ['finger-checkin'] };
  const plan = pickQuest(focus, { ...skippedCheckin, hasFlag: true }).quest!;
  expect(plan.id).toBe('vertical-read');
  expect(
    explainQuest(plan, focus, comparisonLogs, flags, skippedCheckin).evidence,
  ).toContainEqual({
    id: 'quest-selection',
    label: 'Current quest controls',
    detail: 'completed=none; skipped oldest-first=finger-checkin',
  });

  expect(
    pickQuest(focus, {
      completed: [],
      skipped: ['finger-checkin', 'vertical-read'],
      hasFlag: true,
    }).quest?.id,
  ).toBe('finger-checkin');
  expect(
    pickQuest(focus, {
      completed: [],
      skipped: ['vertical-read', 'finger-checkin'],
      hasFlag: true,
    }).quest?.id,
  ).toBe('vertical-read');
  expect(pickQuest(focus, { ...initial, hasFlag: false }).quest?.id).toBe(
    'vertical-quiet-feet',
  );
});
