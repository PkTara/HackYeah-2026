import { GAZELLE_COSMETICS, petStatus } from '../progress';
import {
  emptyRun,
  parseRunState,
  runReducer,
  sampleRunGame,
  sampleRuns,
} from '../runGame';
import { pickRunQuest } from '../runQuests';
import {
  paceText,
  pickRunFocus,
  runTallies,
  weekKm,
  type RunLog,
  type RunType,
} from '../running';

let next = 0;
function run(type: RunType, finished: boolean, date = '2026-10-01'): RunLog {
  next += 1;
  return {
    id: `r${next}`,
    date,
    type,
    surface: 'road',
    km: 5,
    minutes: 30,
    finished,
  };
}

const none = { hasFlag: false, completed: [], skipped: [] };

describe('running profile', () => {
  it('counts finished runs and distance per type in the sample data', () => {
    const t = runTallies(sampleRuns);
    expect([t.easy.finished, t.easy.logged]).toEqual([4, 5]);
    expect([t.tempo.finished, t.tempo.logged]).toEqual([2, 4]);
    expect([t.long.finished, t.long.logged, t.long.km]).toEqual([2, 3, 41]);
  });

  it('reports no rate below three runs instead of a low score', () => {
    const t = runTallies([run('tempo', false), run('tempo', false)]);
    expect(t.tempo.rate).toBeNull();
    expect(t.easy).toEqual({ logged: 0, finished: 0, rate: null, km: 0 });
  });

  it('asks for more runs of the thinnest type first', () => {
    const focus = pickRunFocus([
      run('easy', true),
      run('easy', true),
      run('easy', true),
      run('long', true),
    ]);
    expect(focus).toMatchObject({ kind: 'explore', type: 'tempo' });
  });

  it('focuses on the lowest finish rate once every type has three runs', () => {
    expect(pickRunFocus(sampleRuns)).toMatchObject({
      kind: 'practice',
      type: 'tempo',
    });
  });

  it('writes pace as minutes and seconds per kilometre', () => {
    expect(paceText(5, 31)).toBe('6:12 /km');
    expect(paceText(0, 30)).toBeNull();
  });

  it('adds up the last seven days, today included', () => {
    expect(weekKm(sampleRuns, '2026-10-03')).toBe(56.5);
    expect(weekKm(sampleRuns, '2026-09-01')).toBe(0);
  });
});

describe('gazelle quests', () => {
  it('offers a quest for the focus type', () => {
    const pick = pickRunQuest(pickRunFocus(sampleRuns), none);
    expect(pick.quest?.id).toBe('tempo-even-splits');
    expect(pick.options.map(q => q.id)).toEqual([
      'tempo-even-splits',
      'tempo-marker',
    ]);
  });

  it('pauses running quests and leads with a check-in while a leg is flagged', () => {
    const pick = pickRunQuest(pickRunFocus(sampleRuns), {
      ...none,
      hasFlag: true,
    });
    expect(pick.quest?.id).toBe('leg-checkin');
    expect(pick.paused.map(q => q.id)).toEqual(['tempo-even-splits']);
  });

  it('moves a swapped quest to the back and drops a completed one', () => {
    const focus = pickRunFocus(sampleRuns);
    expect(
      pickRunQuest(focus, { ...none, skipped: ['tempo-even-splits'] }).quest
        ?.id,
    ).toBe('tempo-marker');
    expect(
      pickRunQuest(focus, {
        ...none,
        completed: ['tempo-even-splits', 'tempo-marker'],
      }).quest,
    ).toBeNull();
  });
});

describe('gazelle state', () => {
  it('counts a completed quest once', () => {
    const once = runReducer(emptyRun, { type: 'completeQuest', questId: 'q' });
    const twice = runReducer(once, { type: 'completeQuest', questId: 'q' });
    expect(twice.completed).toEqual(['q']);
  });

  it('keeps the first date when a leg is flagged again', () => {
    const flag = { side: 'left', part: 'knee', date: '2026-10-01' } as const;
    const a = runReducer(emptyRun, { type: 'setLegFlag', flag, flagged: true });
    const b = runReducer(a, {
      type: 'setLegFlag',
      flag: { ...flag, date: '2026-10-03' },
      flagged: true,
    });
    expect(b.legFlags).toEqual([flag]);
    expect(
      runReducer(b, { type: 'setLegFlag', flag, flagged: false }).legFlags,
    ).toEqual([]);
  });

  it('round-trips through JSON and rejects anything else', () => {
    expect(parseRunState(JSON.stringify(sampleRunGame))).toEqual(sampleRunGame);
    expect(parseRunState('{"version":1}')).toBeNull();
    expect(parseRunState('not json')).toBeNull();
  });

  it('levels the gazelle with its own unlocks', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    expect(petStatus(ids, GAZELLE_COSMETICS)).toMatchObject({
      level: 2,
      cosmetics: ['race-bib'],
    });
  });
});
