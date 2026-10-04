import {
  BASELINE_TESTS,
  pickFocus,
  pickSportFocus,
  type ClimbLog,
  type SessionLog,
} from '@hackyeah/core';
import {
  climbSaved,
  homeTestSaved,
  nextHomeTest,
  reachSaved,
  sessionSaved,
} from '../afterSave';

const climb = (
  id: string,
  terrain: ClimbLog['terrain'],
  sent: boolean,
): ClimbLog => ({
  id,
  date: '2026-10-04',
  terrain,
  movements: ['controlled'],
  holds: [],
  grade: 'V3',
  sent,
});

describe('climbSaved', () => {
  it('names the climb, gives the wall tally and asks for more when it is thin', () => {
    const before: ClimbLog[] = [];
    const after = [climb('a', 'slab', true)];
    const message = climbSaved(
      after[0],
      after,
      pickFocus(before),
      pickFocus(after),
    );
    expect(message.title).toBe('Saved V3 slab, sent');
    expect(message.lines[0]).toBe(
      'Slab: 1 of 1 sent. 2 more climbs here and the monkey can compare it.',
    );
  });

  it('says plainly when the focus moved and when it stayed', () => {
    const base = [
      climb('s1', 'slab', true),
      climb('s2', 'slab', true),
      climb('s3', 'slab', true),
      climb('v1', 'vertical', true),
      climb('v2', 'vertical', true),
      climb('v3', 'vertical', false),
      climb('o1', 'overhang', true),
      climb('o2', 'overhang', true),
      climb('o3', 'overhang', true),
    ];
    expect(pickFocus(base).terrain).toBe('vertical');
    // Two failed slab climbs drop slab below vertical.
    const moved = [
      ...base,
      climb('s4', 'slab', false),
      climb('s5', 'slab', false),
    ];
    expect(
      climbSaved(moved[10], moved, pickFocus(base), pickFocus(moved)).lines[1],
    ).toBe('Your focus moved to slab.');
    const stayed = [...base, climb('v4', 'vertical', false)];
    const message = climbSaved(
      stayed[9],
      stayed,
      pickFocus(base),
      pickFocus(stayed),
    );
    expect(message.title).toBe('Saved V3 vertical, not yet');
    expect(message.lines).toEqual([
      'Vertical: 2 of 4 sent.',
      'Your focus stays vertical.',
    ]);
  });
});

describe('home tests', () => {
  const pullUps = BASELINE_TESTS.find(t => t.id === 'pull-ups')!;

  it('compares with the last result, or says it is the first', () => {
    expect(
      homeTestSaved(pullUps, { value: 8 }, undefined, '2026-10-04'),
    ).toEqual({
      title: 'Saved 8 reps',
      lines: [
        'Your first pull-ups result. Redo it in a few weeks to compare.',
      ],
    });
    expect(
      homeTestSaved(
        pullUps,
        { value: 8 },
        { value: 6, date: '2026-10-01' },
        '2026-10-04',
      ).lines,
    ).toEqual(['Last time 6 reps, 3 days ago. Shown on Data.']);
  });

  it('suggests the next test without a result, in setup order', () => {
    expect(nextHomeTest([])?.id).toBe(BASELINE_TESTS[0].id);
    expect(nextHomeTest([], BASELINE_TESTS[0].id)?.id).toBe(
      BASELINE_TESTS[1].id,
    );
    expect(
      nextHomeTest(BASELINE_TESTS.map(t => ({ testId: t.id }))),
    ).toBeUndefined();
  });
});

it('says the ape index after saving reach without judging it', () => {
  expect(reachSaved(183, 180).lines[0]).toContain('Ape index +3 cm');
  expect(reachSaved(170, 175).lines[0]).toContain('Ape index -5 cm');
});

it('gives a sport session the same message shape as a climb', () => {
  const kinds = ['easy', 'tempo', 'long'];
  const log: SessionLog = {
    id: 'r1',
    date: '2026-10-04',
    kind: 'tempo',
    place: 'road',
    distance: 5,
    minutes: 30,
    finished: true,
  };
  const message = sessionSaved(
    '5 km tempo',
    true,
    'Tempo',
    { logged: 1, finished: 1, rate: null, distance: 5 },
    pickSportFocus([], kinds),
    pickSportFocus([log], kinds),
    { easy: 'Easy', tempo: 'Tempo', long: 'Long' },
    'gazelle',
  );
  expect(message.title).toBe('Saved 5 km tempo, finished');
  expect(message.lines[0]).toBe(
    'Tempo: 1 of 1 finished. 2 more and the gazelle can compare it.',
  );
});
