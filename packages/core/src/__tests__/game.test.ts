import { pickFocus } from '../climbing';
import { ageLabel, shortDate } from '../dates';
import { emptyGame, gameReducer, parseGameState } from '../game';
import { petStatus } from '../progress';
import { pickQuest } from '../quests';
import { sampleGame } from '../sample';

const focus = pickFocus(sampleGame.logs);

describe('pickQuest', () => {
  it('offers the practice quest for the focus terrain', () => {
    const pick = pickQuest(focus, { hasFlag: false, completed: [], skipped: [] });
    expect(pick.quest?.id).toBe('vertical-quiet-feet');
    expect(pick.paused).toEqual([]);
  });

  it('pauses finger-loading quests while a finger is flagged', () => {
    const pick = pickQuest(focus, { hasFlag: true, completed: [], skipped: [] });
    expect(pick.paused.map(q => q.id)).toEqual(['vertical-quiet-feet']);
    expect(pick.quest?.id).toBe('finger-checkin');
    expect(pick.options.every(q => !q.loadsFingers)).toBe(true);
  });

  it('cycles through options when quests are swapped', () => {
    const first = pickQuest(focus, { hasFlag: false, completed: [], skipped: [] });
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
    expect(petStatus(sampleGame.completed)).toMatchObject({ level: 1, xpInLevel: 40 });

    let state = gameReducer(sampleGame, { type: 'completeQuest', questId: 'vertical-read' });
    state = gameReducer(state, { type: 'completeQuest', questId: 'vertical-read' });

    expect(petStatus(state.completed)).toEqual({
      xp: 50,
      level: 2,
      xpInLevel: 0,
      cosmetics: ['headband'],
    });
  });

  it('sets and clears a finger flag, and repeating it changes nothing', () => {
    const flag = { side: 'right', finger: 'ring', date: '2026-10-02' } as const;
    const on = gameReducer(emptyGame, { type: 'setFlag', flag, flagged: true });
    expect(on.flags).toEqual([flag]);
    expect(gameReducer(on, { type: 'setFlag', flag, flagged: true }).flags).toEqual([flag]);

    const off = gameReducer(on, { type: 'setFlag', flag, flagged: false });
    expect(off.flags).toEqual([]);
    expect(gameReducer(off, { type: 'setFlag', flag, flagged: false }).flags).toEqual([]);
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
