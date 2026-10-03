import { pickFocus } from '../climbing';
import { ageLabel, shortDate } from '../dates';
import { emptyGame, gameReducer, parseGameState, type HandFlag } from '../game';
import type { BaselineResult, OnboardingResult } from '../onboarding';
import { petStatus } from '../progress';
import { QUESTS, pickQuest } from '../quests';
import { sampleGame } from '../sample';

const sampleQuest = QUESTS[0];

const focus = pickFocus(sampleGame.logs);

describe('pickQuest', () => {
  it('offers the practice quest for the focus terrain', () => {
    const pick = pickQuest(focus, {
      hasFlag: false,
      completed: [],
      skipped: [],
    });
    expect(pick.quest?.id).toBe('vertical-quiet-feet');
    expect(pick.paused).toEqual([]);
  });

  it('pauses finger-loading quests while a finger is flagged', () => {
    const pick = pickQuest(focus, {
      hasFlag: true,
      completed: [],
      skipped: [],
    });
    expect(pick.paused.map(q => q.id)).toEqual(['vertical-quiet-feet']);
    expect(pick.quest?.id).toBe('finger-checkin');
    expect(pick.options.every(q => !q.loadsFingers)).toBe(true);
  });

  it('cycles through options when quests are swapped', () => {
    const first = pickQuest(focus, {
      hasFlag: false,
      completed: [],
      skipped: [],
    });
    const second = pickQuest(focus, {
      hasFlag: false,
      completed: [],
      skipped: [first.quest!.id],
    });
    const third = pickQuest(focus, {
      hasFlag: false,
      completed: [],
      skipped: [first.quest!.id, second.quest!.id],
    });
    expect(second.quest?.id).not.toBe(first.quest?.id);
    expect(third.quest?.id).toBe(first.quest?.id);
  });

  it('runs out of quests once everything for the focus is done', () => {
    const pick = pickQuest(focus, {
      hasFlag: false,
      completed: ['vertical-quiet-feet', 'vertical-read'],
      skipped: [],
    });
    expect(pick.quest).toBeNull();
  });
});

describe('gameReducer', () => {
  it('awards XP once per quest and levels up at 50', () => {
    expect(petStatus(sampleGame.completed)).toMatchObject({
      level: 1,
      xpInLevel: 40,
    });

    let state = gameReducer(sampleGame, {
      type: 'completeQuest',
      questId: 'vertical-read',
    });
    state = gameReducer(state, {
      type: 'completeQuest',
      questId: 'vertical-read',
    });

    expect(petStatus(state.completed)).toEqual({
      xp: 50,
      level: 2,
      xpInLevel: 0,
      cosmetics: ['headband'],
    });
  });

  it('sets and clears a finger flag, and repeating it changes nothing', () => {
    const flag: HandFlag = {
      side: 'right',
      finger: 'ring',
      date: '2026-10-02',
      spots: [],
    };
    const on = gameReducer(emptyGame, { type: 'setFlag', flag, flagged: true });
    expect(on.flags).toEqual([flag]);
    expect(
      gameReducer(on, { type: 'setFlag', flag, flagged: true }).flags,
    ).toEqual([flag]);

    const off = gameReducer(on, { type: 'setFlag', flag, flagged: false });
    expect(off.flags).toEqual([]);
    expect(
      gameReducer(off, { type: 'setFlag', flag, flagged: false }).flags,
    ).toEqual([]);
  });

  it('edits a flag in place: new spots replace the old ones', () => {
    const ring: HandFlag = {
      side: 'right',
      finger: 'ring',
      date: '2026-10-02',
      spots: ['a2'],
    };
    const index: HandFlag = {
      side: 'left',
      finger: 'index',
      date: '2026-10-03',
      spots: [],
    };
    let state = gameReducer(emptyGame, {
      type: 'setFlag',
      flag: ring,
      flagged: true,
    });
    state = gameReducer(state, { type: 'setFlag', flag: index, flagged: true });

    const edited = { ...ring, spots: ['a2', 'pip'] };
    state = gameReducer(state, {
      type: 'setFlag',
      flag: edited,
      flagged: true,
    });

    expect(state.flags).toEqual([edited, index]);
  });

  it('loads flags saved before spots existed as "not sure where"', () => {
    const old = { side: 'right', finger: 'ring', date: '2026-10-02' };
    const saved = JSON.stringify({ ...emptyGame, flags: [old] });
    expect(parseGameState(saved)?.flags).toEqual([{ ...old, spots: [] }]);
  });

  it('only loads saved state that looks valid', () => {
    expect(parseGameState(JSON.stringify(sampleGame))).toEqual(sampleGame);
    expect(parseGameState('{"version":2}')).toBeNull();
    expect(parseGameState('not json')).toBeNull();
    expect(parseGameState(null)).toBeNull();
  });
});

describe('dates', () => {
  it('formats short dates and ages', () => {
    expect(shortDate('2026-09-30')).toBe('30 Sep');
    expect(ageLabel('2026-10-02', '2026-10-03')).toBe('yesterday');
    expect(ageLabel('2026-09-30', '2026-10-03')).toBe('3 days ago');
    expect(ageLabel('2026-10-03', '2026-10-03')).toBe('today');
  });
});

describe('setup and home tests', () => {
  const result: OnboardingResult = {
    version: 1,
    date: '2026-10-03',
    details: {
      places: ['bouldering-gym'],
      experience: '2-to-5-years',
      grade: 'V4',
      goal: 'finger-strength',
      body: { heightCm: 178, armSpanCm: 183 },
    },
    connections: [],
    baseline: [
      {
        testId: 'plank',
        value: 75,
        unit: 'seconds',
        method: 'typed',
        date: '2026-10-03',
      },
    ],
    skippedTests: [
      'dead-hang',
      'pull-ups',
      'sit-and-reach',
      'one-leg-balance',
      'push-ups',
    ],
  };
  const hang: BaselineResult = {
    testId: 'dead-hang',
    value: 32,
    unit: 'seconds',
    method: 'stopwatch',
    date: '2026-10-01',
  };

  it('finishing setup saves the answers, the reach and the test results', () => {
    const state = gameReducer(
      { ...emptyGame, onboardingSkipped: true, baseline: [hang] },
      { type: 'finishOnboarding', result },
    );
    expect(state.onboarding).toBe(result);
    expect(state.onboardingSkipped).toBe(false);
    expect(state.reach).toEqual({
      heightCm: 178,
      armSpanCm: 183,
      date: '2026-10-03',
    });
    // A test skipped this time keeps its earlier result; order follows the tests.
    expect(state.baseline.map(r => r.testId)).toEqual(['dead-hang', 'plank']);
  });

  it('a test done again replaces only that test', () => {
    const again = { ...hang, value: 40, date: '2026-10-03' };
    const state = gameReducer(
      { ...emptyGame, baseline: [hang, result.baseline[0]] },
      { type: 'saveBaseline', result: again },
    );
    expect(state.baseline).toEqual([again, result.baseline[0]]);
  });

  it('a server quest that is completed or skipped is no longer on offer', () => {
    const assigned = { ...sampleQuest, id: 'srv-1' };
    const withQuest = { ...emptyGame, assigned };
    expect(
      gameReducer(withQuest, { type: 'completeQuest', questId: 'srv-1' })
        .assigned,
    ).toBeNull();
    expect(
      gameReducer(withQuest, { type: 'skipQuest', questId: 'srv-1' }).assigned,
    ).toBeNull();
    expect(
      gameReducer(withQuest, { type: 'skipQuest', questId: 'other' }).assigned,
    ).toBe(assigned);
  });

  it('loads saved setup and results, drops bad ones, and never a server quest', () => {
    const saved = parseGameState(
      JSON.stringify({
        ...emptyGame,
        onboarding: result,
        baseline: [hang, { testId: 'plank', value: 'lots', unit: 'seconds' }],
        assigned: sampleQuest,
      }),
    );
    expect(saved?.onboarding).toEqual(result);
    expect(saved?.baseline).toEqual([hang]);
    expect(saved?.assigned).toBeUndefined();

    const old = parseGameState(
      JSON.stringify({
        version: 1,
        logs: [],
        flags: [],
        completed: [],
        skipped: [],
      }),
    );
    expect(old?.onboarding).toBeNull();
    expect(old?.onboardingSkipped).toBe(false);
    expect(old?.baseline).toEqual([]);
    expect(
      parseGameState(
        JSON.stringify({ ...emptyGame, onboarding: { version: 1 } }),
      )?.onboarding,
    ).toBeNull();
  });
});
