import {
  AXIS_RULES,
  LONG_SESSION_CLIMBS,
  MOVEMENT_AXES,
  RADAR_LEVEL_NAME,
  RADAR_LEVEL_POINTS,
  RADAR_MIN_CLIMBS,
  matchesAxis,
  movementRadar,
  radarNextStep,
  scoreMovementAxis,
  testPoints,
  type MovementAxisId,
  type MovementInputs,
} from '../movement';
import { sampleLogs } from '../sample';
import {
  RESEARCH_SOURCES,
  explainMovementAxis,
  explainMovementRadar,
} from '../evidence';
import type { ClimbLog, Movement, Terrain } from '../climbing';
import type { BaselineResult, BaselineTestId } from '../onboarding';
import type { AssessmentRecord } from '../assessments';

let next = 0;
function climb(
  terrain: Terrain,
  movements: Movement[],
  sent = true,
  date = '2026-10-01',
  sample = false,
): ClimbLog {
  next += 1;
  return {
    id: `m${next}`,
    date,
    terrain,
    movements,
    holds: [],
    grade: 'V3',
    sent,
    ...(sample ? { sample: true } : {}),
  };
}

function test(
  testId: BaselineTestId,
  value: number,
  method: BaselineResult['method'] = 'stopwatch',
): BaselineResult {
  return { testId, value, unit: 'seconds', method, date: '2026-10-02' };
}

const inputs = (
  logs: ClimbLog[],
  baseline: BaselineResult[] = [],
  assessments: AssessmentRecord[] = [],
): MovementInputs => ({ logs, baseline, assessments });

/** n climbs that only match `axis`, the first `sent` of them sent. */
function only(axis: MovementAxisId, n: number, sent = n): ClimbLog[] {
  const shape: Record<MovementAxisId, [Terrain, Movement[]]> = {
    footwork: ['vertical', ['technical']],
    balance: ['vertical', ['balance']],
    tension: ['overhang', ['powerful']],
    stamina: ['vertical', ['endurance']],
    dynos: ['vertical', ['dynamic']],
  };
  const [terrain, styles] = shape[axis];
  // Spread over days so no day becomes a long session.
  return Array.from({ length: n }, (_, i) =>
    climb(terrain, styles, i < sent, `2026-09-${String(i + 1).padStart(2, '0')}`),
  );
}

describe('which climbs count for each axis', () => {
  const cases: [MovementAxisId, ClimbLog, boolean][] = [
    ['footwork', climb('slab', ['dynamic']), true],
    ['footwork', climb('vertical', ['controlled']), true],
    ['footwork', climb('vertical', ['technical']), true],
    ['footwork', climb('vertical', ['dynamic']), false],
    ['footwork', climb('overhang', ['technical']), false],
    ['balance', climb('slab', ['powerful']), true],
    ['balance', climb('overhang', ['balance']), true],
    ['balance', climb('vertical', ['controlled']), false],
    ['tension', climb('overhang', ['controlled']), true],
    ['tension', climb('vertical', ['compression']), true],
    ['tension', climb('slab', ['powerful']), true],
    ['tension', climb('vertical', ['technical']), false],
    ['stamina', climb('vertical', ['endurance']), true],
    ['stamina', climb('overhang', ['powerful']), false],
    ['dynos', climb('slab', ['dynamic']), true],
    ['dynos', climb('vertical', ['coordination']), true],
    ['dynos', climb('overhang', ['powerful']), false],
  ];
  it.each(cases)('%s: %j counts %s', (axis, log, expected) => {
    expect(matchesAxis(AXIS_RULES[axis], log)).toBe(expected);
  });

  it('keeps a fixed axis order, clockwise from the top', () => {
    expect(MOVEMENT_AXES).toEqual([
      'footwork',
      'balance',
      'tension',
      'stamina',
      'dynos',
    ]);
  });
});

describe.each(MOVEMENT_AXES)('%s gate and levels', axis => {
  const levelAt = (n: number) =>
    scoreMovementAxis(axis, inputs(only(axis, n))).level;

  it('stays unscored below the gate, with no invented value', () => {
    const score = scoreMovementAxis(
      axis,
      inputs(only(axis, RADAR_MIN_CLIMBS - 1)),
    );
    expect(score.scored).toBe(false);
    expect(score.level).toBe(0);
    expect(score.value).toBeNull();
    expect(RADAR_LEVEL_NAME[score.level]).toBe('Not enough data');
    expect(score.next).toMatch(/to score/);
  });

  it('scores at the gate even when nothing was sent', () => {
    const score = scoreMovementAxis(
      axis,
      inputs(only(axis, RADAR_MIN_CLIMBS, 0)),
    );
    expect(score.scored).toBe(true);
    expect(score.points).toBe(0);
    expect(score.level).toBe(1);
    expect(score.value).toBeCloseTo(1 / 3);
  });

  it('moves up a level exactly at each points boundary', () => {
    const building = RADAR_LEVEL_POINTS.building;
    const established = RADAR_LEVEL_POINTS.established;
    expect(levelAt(building - 1)).toBe(1);
    expect(levelAt(building)).toBe(2);
    expect(levelAt(established - 1)).toBe(2);
    expect(levelAt(established)).toBe(3);
    expect(scoreMovementAxis(axis, inputs(only(axis, established))).value).toBe(
      1,
    );
  });
});

describe('home tests', () => {
  it('score an axis on their own, with no climbs', () => {
    const tension = scoreMovementAxis(
      'tension',
      inputs([], [test('plank', 10)]),
    );
    expect(tension.scored).toBe(true);
    expect(tension.test?.points).toBe(0);
    expect(tension.level).toBe(1);
    expect(scoreMovementAxis('balance', inputs([], [test('one-leg-balance', 12)])).scored).toBe(true);
    expect(scoreMovementAxis('stamina', inputs([], [test('dead-hang', 25)])).scored).toBe(true);
  });

  it('add points at the team marks', () => {
    const marks = AXIS_RULES.tension.test!.marks;
    expect(testPoints(marks, marks[0] - 1)).toBe(0);
    expect(testPoints(marks, marks[0])).toBe(1);
    expect(testPoints(marks, marks[1])).toBe(2);
    expect(testPoints(marks, marks[2])).toBe(3);
    expect(testPoints(marks, marks[2] * 10)).toBe(3);
  });

  it('count together with sends', () => {
    const score = scoreMovementAxis(
      'tension',
      inputs(only('tension', 1), [test('plank', AXIS_RULES.tension.test!.marks[2])]),
    );
    expect(score.points).toBe(4);
    expect(score.level).toBe(2);
  });

  it('only count for their own axis', () => {
    const plank = inputs([], [test('plank', 300)]);
    expect(scoreMovementAxis('footwork', plank).scored).toBe(false);
    expect(scoreMovementAxis('dynos', plank).scored).toBe(false);
    expect(scoreMovementAxis('balance', plank).scored).toBe(false);
  });

  it('record how the result got into the app', () => {
    const timed = scoreMovementAxis('balance', inputs([], [test('one-leg-balance', 20)]));
    expect(timed.test).toMatchObject({ source: 'measured', value: 20 });
    const typed = scoreMovementAxis('balance', inputs([], [test('one-leg-balance', 20, 'typed')]));
    expect(typed.test?.source).toBe('entered');
  });

  it('mark a demo home test as sample data, never as your own', () => {
    const demo = { ...test('plank', 45, 'typed'), sample: true };
    const score = scoreMovementAxis('tension', inputs([], [demo]));
    expect(score.sample).toBe(true);
    expect(score.test?.simulated).toBe(true);
    const explanation = explainMovementAxis(score, []);
    expect(explanation.status).toBe('example');
    expect(explanation.inputSummary).toContain('Plank 45 s, an example result');
    expect(explanation.inputSummary).not.toContain('by you');
  });

  it('use a saved dead hang assessment when the home test is not on this device', () => {
    const record: AssessmentRecord = {
      id: 'a1',
      metric: 'hang_duration',
      value: 45,
      unit: 'seconds',
      method: 'manual',
      protocol: 'dead-hang-v1',
      occurredAt: '2026-10-01T12:00:00Z',
    };
    const score = scoreMovementAxis('stamina', inputs([], [], [record]));
    expect(score.test).toMatchObject({ value: 45, points: 2, source: 'entered' });
    // The home test on this device wins when both exist.
    const both = scoreMovementAxis('stamina', inputs([], [test('dead-hang', 70)], [record]));
    expect(both.test?.value).toBe(70);
  });
});

describe('stamina long sessions', () => {
  it('add a point per day with enough logged climbs, once scored', () => {
    const day = Array.from({ length: LONG_SESSION_CLIMBS }, () =>
      climb('slab', ['controlled'], false, '2026-09-30'),
    );
    const short = Array.from({ length: LONG_SESSION_CLIMBS - 1 }, () =>
      climb('slab', ['controlled'], false, '2026-09-29'),
    );
    const unscored = scoreMovementAxis('stamina', inputs([...day, ...short]));
    expect(unscored.longSessions).toEqual(['2026-09-30']);
    expect(unscored.scored).toBe(false);
    const scored = scoreMovementAxis(
      'stamina',
      inputs([...day, ...short, ...only('stamina', 3, 0)]),
    );
    expect(scored.points).toBe(1);
  });
});

describe('the demo profile', () => {
  const radar = movementRadar(inputs([...sampleLogs]));
  it('scores only what the sample climbs show and marks them as samples', () => {
    expect(radar.map(score => [score.axis, score.level, score.points])).toEqual([
      ['footwork', 2, 6],
      ['balance', 2, 5],
      ['tension', 1, 3],
      ['stamina', 0, 1],
      ['dynos', 1, 3],
    ]);
    expect(radar.filter(score => score.scored).every(score => score.sample)).toBe(
      true,
    );
    expect(radar.find(score => score.axis === 'stamina')?.value).toBeNull();
  });

  it('suggests the axis closest to being scored', () => {
    expect(radarNextStep(radar)).toMatch(/Stamina/);
  });
});

describe('explanations', () => {
  const ids = new Set(RESEARCH_SOURCES.map(source => source.id));

  it('show an unscored axis as not enough data, with the gate not passed', () => {
    const logs = only('dynos', 2);
    const explanation = explainMovementAxis(
      scoreMovementAxis('dynos', inputs(logs)),
      logs,
    );
    expect(explanation.summary).toBe(
      'Dynos is not scored yet. Log 1 more dynamic or coordination climb to score Dynos.',
    );
    expect(explanation.flow?.nodes).toHaveLength(2);
    expect(explanation.flow?.nodes[1]).toMatchObject({
      type: 'check',
      taken: 'no',
      team: true,
    });
    expect(explanation.flow?.result.value).toBe('Not enough data');
    expect(explanation.evidence.map(record => record.id)).toEqual(
      [...logs].reverse().map(log => log.id),
    );
  });

  it('show the test, the points and the level for a scored axis', () => {
    const logs = only('tension', 3, 2);
    const explanation = explainMovementAxis(
      scoreMovementAxis('tension', inputs(logs, [test('plank', 65, 'typed')])),
      logs,
    );
    expect(explanation.summary).toBe(
      'Tension is at Building: 4 points from your own climbs and test.',
    );
    expect(explanation.inputSummary).toBe(
      '3 matching climbs you logged: 2 sent. Plank 65 s, typed in by you.',
    );
    expect(explanation.evidence[0]).toMatchObject({
      label: 'Plank result, 2026-10-02',
      view: { title: 'Plank 65 s', outcome: { text: '+2', done: true } },
    });
    expect(explanation.flow?.nodes[1]).toMatchObject({ taken: 'yes' });
    expect(explanation.flow?.nodes.map(node => node.label)).toContain(
      'Plank marks 30, 60, 90 s',
    );
    expect(explanation.flow?.result).toMatchObject({
      label: 'Tension',
      value: 'Building',
    });
    expect(explanation.status).toBe('app_rule');
  });

  it('mark sample climbs and list long sessions', () => {
    const explanation = explainMovementAxis(
      scoreMovementAxis('stamina', inputs([...sampleLogs])),
      sampleLogs,
    );
    expect(explanation.status).toBe('example');
    expect(explanation.evidence[1]).toMatchObject({
      id: 'radar-long-2026-09-30',
      view: { sample: true },
    });
    const footwork = explainMovementAxis(
      scoreMovementAxis('footwork', inputs([...sampleLogs])),
      sampleLogs,
    );
    expect(footwork.status).toBe('example');
    expect(footwork.evidence.every(record => record.view?.sample)).toBe(true);
  });

  it('cite only registered sources, keep to two limits and say it is not a skill test', () => {
    const radar = movementRadar(inputs([...sampleLogs], [test('plank', 40)]));
    for (const score of radar) {
      const explanation = explainMovementAxis(score, sampleLogs);
      expect(explanation.sourceIds.length).toBeGreaterThan(0);
      expect(explanation.sourceIds.every(id => ids.has(id))).toBe(true);
      expect(explanation.limitations).toHaveLength(2);
      expect(explanation.limitations[0]).toMatch(/not a skill test/);
      const words = [explanation.summary, explanation.rule].join(' ');
      expect(words).not.toMatch(/[–—]|=|true|false|undefined|NaN/);
      expect(explanation.rule).toContain('team');
    }
  });

  it('never let a citation claim the radar is validated or predicts grades', () => {
    for (const id of new Set(
      MOVEMENT_AXES.flatMap(axis => AXIS_RULES[axis].sourceIds),
    )) {
      const source = RESEARCH_SOURCES.find(s => s.id === id)!;
      expect(source.finding).not.toMatch(/radar|app|injur|predict/i);
      expect(source.supports).not.toMatch(/validat|injur|predict/i);
    }
  });

  it('explain the whole radar with one row per axis', () => {
    const explanation = explainMovementRadar(movementRadar(inputs([])));
    expect(explanation.summary).toBe(
      'No axis is scored yet. Each needs 3 matching climbs or its home test.',
    );
    expect(explanation.evidence).toHaveLength(5);
    expect(explanation.flow?.nodes[1]).toMatchObject({ taken: 'no' });
    expect(explanation.sourceIds).toEqual([]);
  });
});

describe('an empty profile', () => {
  const radar = movementRadar(inputs([]));
  it('scores nothing and says how to start', () => {
    expect(radar.every(score => !score.scored && score.value === null)).toBe(true);
    expect(radarNextStep(radar)).toBe(
      'Do the one-leg balance test, or log 3 slab or balance climbs, to score Balance.',
    );
  });

  it('writes plain next steps without dashes', () => {
    for (const score of radar) {
      expect(score.next).not.toMatch(/[–—]/);
    }
    expect(radar.find(s => s.axis === 'dynos')?.next).toBe(
      'Log 3 dynamic or coordination climbs to score Dynos.',
    );
  });
});
