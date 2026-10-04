import {
  MIN_LOGS,
  RUNNING,
  explainCamera,
  explainCell,
  explainFocus,
  explainPause,
  explainQuest,
  explainSportFocus,
  explainSportQuest,
  explainTerrain,
  findQuest,
  flowText,
  isDecisionFlow,
  pickFocus,
  pickQuest,
  pickSportFocus,
  pickSportQuest,
  type ClimbLog,
  type DecisionExplanation,
  type FlowCheck,
  type HandFlag,
  type SessionLog,
  type Terrain,
} from '..';

/** `n` climbs on one wall, the first `sent` of them sent. */
function climbs(terrain: Terrain, n: number, sent = 0): ClimbLog[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${terrain}-${i}`,
    date: `2026-09-${String(10 + i).padStart(2, '0')}`,
    terrain,
    movements: ['controlled'],
    holds: ['crimp'],
    grade: 'V3',
    sent: i < sent,
  }));
}

function flowOf(explanation: DecisionExplanation) {
  const flow = explanation.flow;
  if (!isDecisionFlow(flow)) {
    throw new Error('expected a drawable flow');
  }
  return flow;
}

function check(explanation: DecisionExplanation, label: RegExp): FlowCheck {
  const node = flowOf(explanation).nodes.find(
    n => n.type === 'check' && label.test(n.label),
  );
  if (node?.type !== 'check') {
    throw new Error(`no check matching ${label}`);
  }
  return node;
}

const flag: HandFlag = {
  side: 'right',
  finger: 'ring',
  date: '2026-10-01',
  spots: ['a2'],
};

describe('focus flow', () => {
  it('takes the "fewest logs" branch while a wall has fewer than 3 logs', () => {
    const logs = [...climbs('slab', 4, 2), ...climbs('vertical', 1)];
    const focus = pickFocus(logs);
    expect(focus).toMatchObject({ kind: 'explore', terrain: 'overhang' });
    const explanation = explainFocus(focus, logs);
    const gate = check(explanation, /Every wall has 3\+ climbs/);
    expect(gate.taken).toBe('no');
    expect(gate.no).toBe('Pick the fewest climbs');
    expect(gate.detail).toBe('Under 3: vertical 1, overhang 0');
    expect(gate.team).toBe(true);
    expect(check(explanation, /tie/).taken).toBe('no');
    expect(flowOf(explanation).result).toEqual({
      label: 'Focus',
      value: 'Overhang',
      icon: 'overhang',
    });
    // The wall that became the focus is the marked input.
    expect(flowOf(explanation).inputs.filter(input => input.key)).toEqual([
      { label: 'Overhang', value: '0 of 0 sent', icon: 'overhang', key: true },
    ]);
  });

  it('takes the "lowest share" branch once every wall has 3 logs', () => {
    const logs = [
      ...climbs('slab', 3, 3),
      ...climbs('vertical', 4, 1),
      ...climbs('overhang', 3, 2),
    ];
    const focus = pickFocus(logs);
    const explanation = explainFocus(focus, logs);
    const gate = check(explanation, /Every wall/);
    expect(gate.taken).toBe('yes');
    expect(gate.yes).toBe('Pick the lowest share sent');
    expect(gate.detail).toBe('Slab 100%, vertical 25%, overhang 67%');
    expect(flowOf(explanation).result.value).toBe('Vertical');
    expect(flowText(flowOf(explanation))).toContain(
      'Step 2: Every wall has 3+ climbs? Yes, so pick the lowest share sent. Slab 100%, vertical 25%, overhang 67%.',
    );
  });

  it('shows the tie order as the branch taken when walls tie', () => {
    // Every wall at 3 logs and 1 send: slab wins the tie.
    const shares = [
      ...climbs('slab', MIN_LOGS, 1),
      ...climbs('vertical', MIN_LOGS, 1),
      ...climbs('overhang', MIN_LOGS, 1),
    ];
    const tied = explainFocus(pickFocus(shares), shares);
    const tie = check(tied, /tie/);
    expect(tie.taken).toBe('yes');
    expect(tie.yes).toBe('Slab, then vertical, then overhang');
    expect(tie.detail).toBe('Slab, vertical and overhang tie');
    expect(flowOf(tied).result.value).toBe('Slab');

    // No climbs at all: the fewest-logs branch, also settled by the order.
    const empty = explainFocus(pickFocus([]), []);
    expect(check(empty, /Every wall/).taken).toBe('no');
    expect(check(empty, /tie/).taken).toBe('yes');
    expect(flowOf(empty).result.value).toBe('Slab');
  });

  it('sums up the inputs in one plain line', () => {
    const logs = [...climbs('vertical', 6, 2)];
    expect(explainFocus(pickFocus(logs), logs).inputSummary).toBe(
      '6 climbs: 2 sent, 4 not yet.',
    );
    expect(explainTerrain('vertical', logs).inputSummary).toBe(
      '6 vertical climbs: 2 sent, 4 not yet.',
    );
    expect(explainTerrain('slab', climbs('slab', 1)).inputSummary).toBe(
      '1 slab climb: 0 sent, 1 not yet.',
    );
    expect(explainTerrain('slab', []).inputSummary).toBe(
      'No slab climbs logged yet.',
    );
  });

  it('draws each climb as a short row, newest first, without its id', () => {
    const logs = [
      { ...climbs('slab', 1)[0], id: 'old', date: '2026-09-21' },
      {
        ...climbs('slab', 1, 1)[0],
        id: 'new',
        date: '2026-09-30',
        movements: ['controlled', 'dynamic'] as const,
        holds: ['pinch', 'crimp'] as const,
        sample: true,
      },
    ];
    const [first, second] = explainTerrain('slab', logs).evidence;
    expect(first.id).toBe('new');
    expect(first.view).toEqual({
      when: '30 Sep',
      badge: 'V3',
      icon: 'slab',
      title: 'Slab',
      note: 'Controlled and dynamic, pinches and crimps',
      outcome: { text: 'Sent', done: true },
      sample: true,
    });
    expect(second.view?.outcome).toEqual({ text: 'Not yet', done: false });
    expect(JSON.stringify(first.view)).not.toContain('new');
  });
});

describe('quest and pause flows', () => {
  it('takes the finger pause branch and puts the check-in first', () => {
    const logs = [
      ...climbs('slab', 3, 3),
      ...climbs('vertical', 3),
      ...climbs('overhang', 3, 3),
    ];
    const focus = pickFocus(logs);
    const selection = { completed: ['vertical-read'], skipped: [] };
    const quest = pickQuest(focus, { ...selection, hasFlag: true }).quest!;
    expect(quest.id).toBe('finger-checkin');
    const explanation = explainQuest(quest, focus, logs, [flag], selection);
    expect(check(explanation, /Every wall/).taken).toBe('yes');
    const pause = check(explanation, /finger flagged/);
    expect(pause.taken).toBe('yes');
    expect(pause.yes).toBe('Pause finger quests. Check-in first');
    expect(pause.feed).toEqual({
      label: 'Right ring',
      value: 'flagged',
      icon: 'flag',
    });
    const last = flowOf(explanation).nodes.at(-1)!;
    expect(last.feed?.value).toBe('1 done, 0 swapped');
    expect(flowOf(explanation).result).toEqual({
      label: 'Quest',
      value: quest.title,
      icon: 'banana',
    });
    expect(explanation.inputSummary).toBe(
      '9 climbs, 1 flagged finger and your quest progress.',
    );
    // The flag leads the inputs: it decided this quest.
    expect(explanation.evidence[0].id).toBe('right/ring');
  });

  it('leaves the pause branch untaken without a flag', () => {
    const logs = climbs('slab', 1);
    const focus = pickFocus(logs);
    const quest = pickQuest(focus, {
      hasFlag: false,
      completed: [],
      skipped: [],
    }).quest!;
    const explanation = explainQuest(quest, focus, logs, []);
    expect(check(explanation, /Every wall/).taken).toBe('no');
    expect(check(explanation, /finger flagged/).taken).toBe('no');
    expect(check(explanation, /finger flagged/).feed?.label).toBe(
      'No finger flagged',
    );
  });

  it('shows titles for known quests and only counts unknown ids', () => {
    const logs = climbs('slab', 1);
    const focus = pickFocus(logs);
    const explanation = explainQuest(findQuest('log-slab')!, focus, logs, [], {
      completed: ['vertical-read', 'sample-onboarding'],
      skipped: [],
    });
    const progress = explanation.evidence.find(
      record => record.id === 'quest-progress',
    )!;
    expect(progress.view?.note).toBe(
      `Done: ${
        findQuest('vertical-read')!.title
      } and 1 other quest. Swapped: none.`,
    );
    expect(progress.view?.note).not.toContain('sample-onboarding');
  });

  it('draws the pause rule from the flags', () => {
    const paused = explainPause([flag]);
    expect(check(paused, /finger flagged/).taken).toBe('yes');
    expect(flowOf(paused).result.value).toBe('Paused');
    expect(paused.inputSummary).toBe('1 flagged finger.');
    expect(paused.evidence[0].view).toMatchObject({
      when: 'Since 1 Oct',
      title: 'Right ring',
      note: 'Sore at A2 pulley',
    });
    const open = explainPause([]);
    expect(check(open, /finger flagged/).taken).toBe('no');
    expect(flowOf(open).result.value).toBe('Open');
    expect(open.inputSummary).toBe('No finger flagged.');
  });

  it('draws no flow for a server snapshot or an unknown quest', () => {
    const decision: DecisionExplanation = {
      summary: 'Server choice',
      status: 'app_rule',
      rule: 'From the server.',
      evidence: [],
      sourceIds: [],
      limitations: [],
    };
    const logs = climbs('slab', 1);
    const local = findQuest('log-slab')!;
    expect(
      explainQuest({ ...local, decision }, pickFocus(logs), logs, []).flow,
    ).toBeUndefined();
    expect(
      explainQuest({ ...local, id: 'gone' }, pickFocus(logs), logs, []).flow,
    ).toBeUndefined();
    expect(explainCamera({ value: 80, decision }).flow).toBeUndefined();
  });
});

describe('tally and camera flows', () => {
  it('only shows the share sent from 3 climbs', () => {
    const few = explainTerrain('vertical', climbs('vertical', 2, 1));
    expect(check(few, /climbs logged/).taken).toBe('no');
    expect(check(few, /climbs logged/).detail).toBe('2 of 3 so far');
    expect(flowOf(few).result.value).toBe('1 of 2 sent');
    const enough = explainTerrain('vertical', climbs('vertical', 6, 2));
    expect(check(enough, /climbs logged/).taken).toBe('yes');
    expect(flowOf(enough).result.value).toBe('2 of 6 sent, 33%');
  });

  it('names both filters for a grid box', () => {
    const cell = explainCell('vertical', 'controlled', climbs('vertical', 3));
    expect(flowOf(cell).nodes[0]).toEqual({
      type: 'step',
      label: 'Only vertical climbs marked controlled',
    });
  });

  it('only measures shoulder reach when the reading came back', () => {
    const read = explainCamera({ metric: 'shoulder_reach', value: 170 });
    expect(check(read, /arms straight/).taken).toBe('yes');
    expect(flowOf(read).result.value).toBe('170 degrees');
    const missing = explainCamera({ metric: 'shoulder_reach', value: null });
    expect(check(missing, /arms straight/).taken).toBe('no');
    expect(flowOf(missing).result.value).toBe('Unavailable');
    const legs = explainCamera({ value: 82 });
    expect(flowOf(legs).nodes.every(node => node.type === 'step')).toBe(true);
    expect(flowOf(legs).result).toEqual({
      label: 'Leg spread',
      value: '82 degrees',
      icon: 'ruler',
    });
  });
});

describe('sport flows', () => {
  const words = {
    pet: 'gazelle',
    session: 'run',
    sessions: 'runs',
    unit: 'km',
    kindName: { easy: 'Easy', tempo: 'Tempo', long: 'Long' },
    placeName: { road: 'Road', trail: 'Trail', track: 'Track' },
    bodyPartName: { knee: 'Knee' },
    kindPlural: 'run types',
  };
  const run = (kind: string, i: number, finished: boolean): SessionLog => ({
    id: `${kind}-${i}`,
    date: '2026-10-01',
    kind,
    place: 'road',
    distance: 5,
    minutes: 30,
    finished,
  });

  it('uses the sport words for the gate and the run rows', () => {
    const logs = ['easy', 'tempo', 'long'].flatMap(kind =>
      [0, 1, 2].map(i => run(kind, i, kind !== 'tempo' || i === 0)),
    );
    const focus = pickSportFocus(logs, RUNNING.kinds);
    const explanation = explainSportFocus(focus, logs, RUNNING.kinds, words);
    const gate = check(explanation, /Every run type has 3\+ runs/);
    expect(gate.taken).toBe('yes');
    expect(gate.yes).toBe('Pick the lowest share finished');
    expect(flowOf(explanation).result.value).toBe('Tempo');
    expect(explanation.inputSummary).toBe('9 runs: 7 finished, 2 cut short.');
    expect(explanation.evidence[0].view).toMatchObject({
      badge: '5',
      badgeNote: 'km',
      icon: 'long',
      outcome: { text: 'Finished', done: true },
    });
  });

  it('pauses run quests while something is flagged sore', () => {
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
      words,
    );
    const pause = check(explanation, /flagged sore/);
    expect(pause.taken).toBe('yes');
    expect(pause.yes).toBe('Pause run quests');
    expect(pause.feed?.label).toBe('Left knee');
    expect(check(explanation, /Every run type/).taken).toBe('no');
    expect(flowOf(explanation).result.value).toBe(quest.title);
  });
});

it('keeps every drawn flow valid and rejects broken ones', () => {
  expect(isDecisionFlow(undefined)).toBe(false);
  expect(isDecisionFlow({ inputs: [], nodes: [], result: {} })).toBe(false);
  expect(
    isDecisionFlow({
      inputs: [],
      nodes: [
        { type: 'check', label: 'Q?', taken: 'maybe', yes: 'a', no: 'b' },
      ],
      result: { label: 'R', value: 'v' },
    }),
  ).toBe(false);
  const logs = climbs('slab', 2);
  for (const explanation of [
    explainFocus(pickFocus(logs), logs),
    explainPause([flag]),
    explainTerrain('slab', logs),
    explainCamera({ metric: 'shoulder_reach', value: 100 }),
  ]) {
    expect(isDecisionFlow(explanation.flow)).toBe(true);
    const words = flowText(flowOf(explanation)).join(' ');
    expect(words).not.toMatch(/[–—]/);
  }
});
