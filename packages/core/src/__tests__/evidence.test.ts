import {
  explainFocus,
  explainPause,
  explainQuest,
  explainTerrain,
  explainMovement,
  explainCamera,
  explainCell,
  explainSportFocus,
  explainSportQuest,
  EXPORT_SOURCE_IDS,
  RESEARCH_SOURCES,
  RUNNING,
  pickSportFocus,
  pickSportQuest,
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
  expect(explanation.evidence).toMatchObject([
    {
      id: 'climb-1',
      label: 'Climb, 2026-10-03',
      detail: 'Slab, dynamic, crimp, V3. Not sent.',
    },
  ]);
  expect(explanation.rule).toContain('vertical 0 of 0');
  expect(explanation.rule).toContain('slab 0 of 1');
  expect(explanation.rule).toContain('needs 3 logged climbs');
  expect(explanation.rule).toContain('slab first, then vertical');
  expect(explanation.summary).toContain('fewest logged climbs');
  expect(explanation.limitations.join(' ')).toMatch(/app threshold/);
  // Selection rules are app rules: no borrowed authority.
  expect(explanation.sourceIds).toEqual([]);
});

it('explains finger-loading pauses from dated user flags without diagnosing safety', () => {
  const explanation = explainPause([
    { side: 'left', finger: 'ring', date: '2026-10-02', spots: ['a2'] },
  ]);
  expect(explanation.evidence[0]).toMatchObject({
    id: 'left/ring',
    label: 'Flagged finger, since 2026-10-02',
    detail:
      'Left ring, sore at A2 pulley. Pain ratings are not kept with the flag.',
  });
  expect(explanation.rule).toContain('quests that load the fingers');
  expect(explanation.limitations.join(' ')).toContain(
    'not a medical all-clear',
  );
  expect(explanation.limitations.join(' ')).toContain(
    'No study has tested whether pausing',
  );
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
  expect(explanation.limitations.join(' ')).toContain(
    'No study has tested this drill',
  );
  // No paper is attached to a drill nobody has tested.
  expect(explanation.sourceIds).toEqual([]);
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
  expect(unknown.rule).toMatch(/not recorded/i);
  expect(unknown.summary).toMatch(/not saved/i);
  expect(unknown.evidence).toEqual([]);
  expect(unknown.sourceIds).toEqual([]);
});

it('explains terrain counts with matching records and hides the rate below the product threshold', () => {
  const explanation = explainTerrain('slab', logs);
  expect(explanation.summary).toContain('0 of the 1 slab climbs');
  expect(explanation.evidence.map(entry => entry.id)).toEqual(['climb-1']);
  expect(explanation.rule).toContain('Count the slab climbs you logged: 1');
  expect(explanation.rule).toContain('fewer than 3');
  expect(explanation.rule).toContain('not shown or compared');
});

it('explains movement counts including multi-style logs once per selected movement', () => {
  const both = { ...logs[0], movements: ['dynamic', 'controlled'] as const };
  const explanation = explainMovement('controlled', [both]);
  expect(explanation.summary).toContain('0 of the 1 controlled climbs');
  expect(explanation.evidence.map(entry => entry.id)).toEqual(['climb-1']);
  expect(explanation.rule).toContain('several styles');
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
  expect(explanation.rule).toContain('midway between the two hips');
  const inputs = explanation.evidence.map(entry => entry.detail).join(' ');
  expect(inputs).toContain('82.4');
  expect(inputs).toContain('Model: v1');
  expect(inputs).toContain('front-facing-leg-spread-v1');
  // Missing pose inputs are reported, never reconstructed.
  expect(inputs).toContain('coordinates were not returned');
  expect(explanation.limitations.join(' ')).toContain('Visibility');
  expect(explanation.limitations.join(' ')).toContain(
    'not a measured joint range',
  );
  expect(explanation.sourceIds).toEqual(['stenum2021', 'barzegar2024']);
});

it('provides original research links and explicit reading depth and limitations for all scoped sources', () => {
  expect(RESEARCH_SOURCES).toHaveLength(37);
  expect(new Set(RESEARCH_SOURCES.map(source => source.id)).size).toBe(37);
  // Where no DOI was confirmed, the link goes to a public record instead,
  // and the limits say so. No DOI is made up.
  const noConfirmedDoi = ['wolff2011', 'harkin2016', 'coleman2012', 'foster2001'];
  for (const source of RESEARCH_SOURCES) {
    if (noConfirmedDoi.includes(source.id)) {
      expect(source.url).toMatch(/^https:\/\/(pmc|pubmed|eprints)\./);
    } else {
      expect(source.url).toMatch(/^https:\/\/doi.org\//);
    }
    expect(source.readingDepth).toBeTruthy();
    expect(source.limitations.length).toBeGreaterThan(0);
    expect(source.population).toBeTruthy();
    expect(source.verifiedAt).toMatch(/^2026-10-0[34]$/);
  }
  expect(
    RESEARCH_SOURCES.find(source => source.id === 'paxton2012')?.population,
  ).toContain('no human');
});

it('marks every export layout source as read at abstract level and scoped to layout only', () => {
  const ids = new Set(RESEARCH_SOURCES.map(source => source.id));
  expect(EXPORT_SOURCE_IDS).toHaveLength(20);
  for (const id of EXPORT_SOURCE_IDS) {
    expect(ids.has(id)).toBe(true);
    const source = RESEARCH_SOURCES.find(entry => entry.id === id)!;
    expect(source.readingDepth).toMatch(/^abstract only/);
    expect(source.verifiedAt).toBe('2026-10-04');
    expect(source.limitations.length).toBeGreaterThan(0);
    // A layout reason, never a claim about the app.
    expect(
      [source.finding, source.supports, ...source.limitations].join(' '),
    ).not.toMatch(/validat(es|ed) (the|this) app|prevents? injur/i);
  }
  // Rejected in the design: never cited.
  expect(ids.has('brandes2015')).toBe(false);
});

it('shows completed and skip-order inputs when supplied for local quest selection', () => {
  const explanation = explainQuest(
    findQuest('vertical-read')!,
    pickFocus(logs),
    logs,
    [],
    { completed: ['done-id'], skipped: ['skip-first', 'skip-last'] },
  );
  expect(explanation.evidence).toContainEqual(
    expect.objectContaining({
      id: 'quest-progress',
      label: 'Your quest progress',
      detail: 'Done: done-id. Swapped, oldest first: skip-first and skip-last.',
    }),
  );
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
  expect(initialExplanation.rule).toContain('a finger check-in goes first');
  expect(initialExplanation.rule).toContain(
    'Swapped quests go to the back, oldest swap first',
  );
  expect(initialExplanation.rule).toContain(
    'Other ties follow the order of the quest library',
  );
  expect(initialExplanation.evidence).toContainEqual(
    expect.objectContaining({
      id: 'quest-progress',
      label: 'Your quest progress',
      detail: 'Done: none. Swapped, oldest first: none.',
    }),
  );
  expect(initialExplanation.evidence).toContainEqual(
    expect.objectContaining({
      id: 'left/ring',
      label: 'Flagged finger, since 2026-10-03',
      detail:
        'Left ring, sore with no spot marked. Pain ratings are not kept with the flag.',
    }),
  );

  const skippedCheckin = { completed: [], skipped: ['finger-checkin'] };
  const plan = pickQuest(focus, { ...skippedCheckin, hasFlag: true }).quest!;
  expect(plan.id).toBe('vertical-read');
  expect(
    explainQuest(plan, focus, comparisonLogs, flags, skippedCheckin).evidence,
  ).toContainEqual(
    expect.objectContaining({
      id: 'quest-progress',
      label: 'Your quest progress',
      detail: 'Done: none. Swapped, oldest first: Finger check-in.',
    }),
  );

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

it('explains shoulder outputs with bilateral values and the matching joint geometry', () => {
  const explanation = explainCamera({
    metric: 'shoulder_reach',
    value: 170,
    leftValue: 160,
    rightValue: 180,
    confidence: 0.85,
    protocol: 'front-facing-overhead-reach-v1',
    method: 'camera',
  });
  expect(explanation.summary).toContain('Shoulder reach');
  expect(explanation.summary).toContain('left 160');
  expect(explanation.summary).toContain('right 180');
  expect(explanation.rule).toContain('between the hip and the elbow');
  expect(explanation.rule).toContain('at least 160 degrees at the elbow');
  expect(explanation.rule).not.toContain('midway between the two hips');
  expect(explanation.evidence[0].detail).toContain('(left 160, right 180)');
  expect(explanation.evidence[0].detail).toContain('Model: not recorded');
  expect(explanation.sourceIds).toEqual(['stenum2021', 'barzegar2024']);
  expect(explanation.limitations.join(' ')).toContain('bent elbows');
});

it('gives every source one plain finding with no long dashes', () => {
  for (const source of RESEARCH_SOURCES) {
    expect(source.finding.length).toBeGreaterThan(20);
    expect(source.finding).not.toMatch(/[–—]/);
    expect(source.title).not.toMatch(/[–—]/);
  }
});

it('writes local rules in plain words, without rule IDs, booleans or field names', () => {
  const both = { ...logs[0], movements: ['dynamic', 'controlled'] as const };
  const flags = [
    {
      side: 'left' as const,
      finger: 'ring' as const,
      date: '2026-10-02',
      spots: [],
    },
  ];
  const all = [
    explainFocus(pickFocus(logs), logs),
    explainPause(flags),
    explainQuest(findQuest('vertical-read')!, pickFocus(logs), logs, flags, {
      completed: [],
      skipped: [],
    }),
    explainTerrain('slab', logs),
    explainMovement('controlled', [both]),
    explainCell('slab', 'dynamic', logs),
    explainCamera({ value: 80, confidence: 0.9 }),
    explainCamera({ metric: 'shoulder_reach', value: 170 }),
  ];
  for (const explanation of all) {
    const words = [explanation.summary, explanation.rule].join(' ');
    expect(words).not.toMatch(/-v1|=|true|false|loadsFingers|needsFlag/);
    expect(words).not.toMatch(/[–—]/);
    expect(explanation.limitations.length).toBeLessThanOrEqual(2);
  }
});

it('cites research only where a published claim is made', () => {
  const focus = pickFocus(logs);
  expect(explainTerrain('slab', logs).sourceIds).toEqual([]);
  expect(explainFocus(focus, logs).sourceIds).toEqual([]);
  expect(
    explainQuest(findQuest('log-slab')!, focus, logs, []).sourceIds,
  ).toEqual([]);
  // The preview quest rests on published preview studies.
  expect(
    explainQuest(findQuest('vertical-read')!, focus, logs, []).sourceIds,
  ).toEqual(['sanchez2012', 'seifert2017']);
  const ids = new Set(RESEARCH_SOURCES.map(source => source.id));
  for (const id of explainPause([]).sourceIds) {
    expect(ids.has(id)).toBe(true);
  }
});

it('explains a wall and style box using only climbs that match both', () => {
  const other = { ...logs[0], id: 'climb-2', terrain: 'vertical' as const };
  const explanation = explainCell('slab', 'dynamic', [logs[0], other]);
  expect(explanation.evidence.map(entry => entry.id)).toEqual(['climb-1']);
  expect(explanation.rule).toContain('Only slab climbs marked dynamic count');
});

const sportWords = {
  pet: 'gazelle',
  session: 'run',
  sessions: 'runs',
  unit: 'km',
  kindName: { easy: 'Easy', tempo: 'Tempo', long: 'Long' },
  placeName: { road: 'Road', trail: 'Trail', track: 'Track' },
  bodyPartName: { knee: 'Knee' },
};

it('explains a sport focus with the same three-log gate and tie order', () => {
  const runs = [
    {
      id: 'run-1',
      date: '2026-10-01',
      kind: 'tempo',
      place: 'road',
      distance: 5,
      minutes: 30,
      finished: true,
      sample: true,
    },
  ];
  const focus = pickSportFocus(runs, RUNNING.kinds);
  const explanation = explainSportFocus(focus, runs, RUNNING.kinds, sportWords);
  expect(explanation.summary).toContain('fewest logged runs');
  expect(explanation.status).toBe('example');
  expect(explanation.rule).toContain('tempo 1 of 1');
  expect(explanation.rule).toContain('needs 3 logged runs');
  expect(explanation.evidence[0]).toMatchObject({
    id: 'run-1',
    label: 'Run, 2026-10-01 (example)',
    detail: 'Tempo, road, 5 km, 30 min. Finished as planned.',
  });
  expect(explanation.sourceIds).toEqual([]);
});

it('explains a sport quest from its focus, flags and progress', () => {
  const state = {
    logs: [],
    flags: [{ side: 'left' as const, part: 'knee', date: '2026-10-02' }],
    completed: [],
    skipped: [],
  };
  const focus = pickSportFocus(state.logs, RUNNING.kinds);
  const quest = pickSportQuest(RUNNING.quests, focus, {
    hasFlag: false,
    completed: [],
    skipped: [],
  }).quest!;
  const explanation = explainSportQuest(
    quest,
    focus,
    state,
    RUNNING.quests,
    RUNNING.kinds,
    sportWords,
  );
  expect(explanation.summary).toBe(quest.why);
  expect(explanation.rule).toContain(`About ${quest.minutes} minutes`);
  expect(explanation.evidence).toContainEqual(
    expect.objectContaining({
      id: 'left/knee',
      label: 'Flagged sore, since 2026-10-02',
      detail: 'Left knee.',
    }),
  );
  expect(explanation.evidence).toContainEqual(
    expect.objectContaining({
      id: 'quest-progress',
      label: 'Your quest progress',
      detail: 'Done: none. Swapped, oldest first: none.',
    }),
  );
});
