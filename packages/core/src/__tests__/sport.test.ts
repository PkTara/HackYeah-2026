import { petStatus } from '../progress';
import {
  emptySport,
  parseSportState,
  pickSportFocus,
  pickSportQuest,
  sportReducer,
  talliesBy,
  weekDistance,
  type SessionLog,
} from '../sport';
import { RUNNING, SPORTS, SPORT_IDS, SWIMMING, sportFor } from '../sports';

let next = 0;
function run(kind: string, finished: boolean): SessionLog {
  next += 1;
  return {
    id: `r${next}`,
    date: '2026-10-01',
    kind,
    place: 'road',
    distance: 5,
    minutes: 30,
    finished,
  };
}

const none = { hasFlag: false, completed: [], skipped: [] };

describe('sport profile rules', () => {
  it('counts finished sessions and distance per kind in the sample runs', () => {
    const t = talliesBy(RUNNING.sample.logs, 'kind', RUNNING.kinds);
    expect([t.easy.finished, t.easy.logged]).toEqual([4, 5]);
    expect([t.tempo.finished, t.tempo.logged]).toEqual([2, 4]);
    expect([t.long.finished, t.long.logged, t.long.distance]).toEqual([
      2, 3, 41,
    ]);
  });

  it('reports no rate below three sessions instead of a low score', () => {
    const t = talliesBy([run('tempo', false), run('tempo', false)], 'kind', [
      'easy',
      'tempo',
    ]);
    expect(t.tempo.rate).toBeNull();
    expect(t.easy).toEqual({ logged: 0, finished: 0, rate: null, distance: 0 });
  });

  it('asks for more sessions of the thinnest kind first', () => {
    const logs = [run('easy', true), run('easy', true), run('easy', true)];
    expect(pickSportFocus(logs, RUNNING.kinds)).toMatchObject({
      kind: 'explore',
      sessionKind: 'tempo',
    });
  });

  it('focuses on the lowest finish rate once every kind has three', () => {
    expect(pickSportFocus(RUNNING.sample.logs, RUNNING.kinds)).toMatchObject({
      kind: 'practice',
      sessionKind: 'tempo',
    });
    expect(pickSportFocus(SWIMMING.sample.logs, SWIMMING.kinds)).toMatchObject({
      kind: 'practice',
      sessionKind: 'back',
    });
  });

  it('adds up the last seven days, today included', () => {
    expect(weekDistance(RUNNING.sample.logs, '2026-10-03')).toBe(56.5);
    expect(weekDistance(SWIMMING.sample.logs, '2026-10-03')).toBe(5200);
    expect(weekDistance(RUNNING.sample.logs, '2026-09-01')).toBe(0);
  });

  it('writes pace per kilometre for runs and per 100 m for swims', () => {
    expect(RUNNING.pace(5, 31)).toBe('6:12 /km');
    expect(SWIMMING.pace(1000, 25)).toBe('2:30 /100 m');
    expect(SWIMMING.pace(0, 25)).toBeNull();
  });
});

describe('sport quests', () => {
  const runFocus = pickSportFocus(RUNNING.sample.logs, RUNNING.kinds);

  it('offers a quest for the focus kind', () => {
    const pick = pickSportQuest(RUNNING.quests, runFocus, none);
    expect(pick.options.map(q => q.id)).toEqual([
      'tempo-even-splits',
      'tempo-marker',
    ]);
    const swimFocus = pickSportFocus(SWIMMING.sample.logs, SWIMMING.kinds);
    expect(pickSportQuest(SWIMMING.quests, swimFocus, none).quest?.id).toBe(
      'back-still-head',
    );
  });

  it('pauses quests that load the body and leads with a check-in while flagged', () => {
    const pick = pickSportQuest(RUNNING.quests, runFocus, {
      ...none,
      hasFlag: true,
    });
    expect(pick.quest?.id).toBe('leg-checkin');
    expect(pick.paused.map(q => q.id)).toEqual(['tempo-even-splits']);
  });

  it('moves a swapped quest to the back and drops a completed one', () => {
    expect(
      pickSportQuest(RUNNING.quests, runFocus, {
        ...none,
        skipped: ['tempo-even-splits'],
      }).quest?.id,
    ).toBe('tempo-marker');
    expect(
      pickSportQuest(RUNNING.quests, runFocus, {
        ...none,
        completed: ['tempo-even-splits', 'tempo-marker'],
      }).quest,
    ).toBeNull();
  });

  it('has a log quest per kind and a check-in in every sport', () => {
    for (const id of SPORT_IDS) {
      const sport = SPORTS[id];
      for (const kind of sport.kinds) {
        expect(
          sport.quests.filter(q => q.kind === 'log' && q.sessionKind === kind),
        ).toHaveLength(1);
      }
      expect(sport.quests.some(q => q.needsFlag)).toBe(true);
      expect(new Set(sport.quests.map(q => q.id)).size).toBe(
        sport.quests.length,
      );
    }
  });
});

describe('sport state', () => {
  it('counts a completed quest once', () => {
    const once = sportReducer(emptySport, {
      type: 'completeQuest',
      questId: 'q',
    });
    expect(
      sportReducer(once, { type: 'completeQuest', questId: 'q' }).completed,
    ).toEqual(['q']);
  });

  it('keeps the first date when a spot is flagged again', () => {
    const flag = {
      side: 'left',
      part: 'shoulder',
      date: '2026-10-01',
    } as const;
    const a = sportReducer(emptySport, {
      type: 'setFlag',
      flag,
      flagged: true,
    });
    const b = sportReducer(a, {
      type: 'setFlag',
      flag: { ...flag, date: '2026-10-03' },
      flagged: true,
    });
    expect(b.flags).toEqual([flag]);
    expect(
      sportReducer(b, { type: 'setFlag', flag, flagged: false }).flags,
    ).toEqual([]);
  });

  it('round-trips through JSON and rejects anything else', () => {
    expect(parseSportState(JSON.stringify(SWIMMING.sample))).toEqual(
      SWIMMING.sample,
    );
    expect(parseSportState('{"version":1}')).toBeNull();
    expect(parseSportState('not json')).toBeNull();
  });

  it('gives each pet its own unlocks and finds the sport a pet leads', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    expect(petStatus(five, RUNNING.unlocks).cosmetics).toEqual(['race-bib']);
    expect(petStatus(five, SWIMMING.unlocks).cosmetics).toEqual(['swim-cap']);
    expect(sportFor('dolphin')).toBe(SWIMMING);
    expect(sportFor('monkey')).toBeNull();
  });
});
