import {
  addDays,
  dayHeading,
  defaultRange,
  filterLogs,
  groupByDay,
  rangeBounds,
} from '../logRange';

const log = (id: string, date: string) => ({ id, date });
const ids = (logs: readonly { id: string }[]) => logs.map(l => l.id);

// 2026-10-04 is a Sunday; its week runs Mon 28 Sep to Sun 4 Oct.
const SUNDAY = '2026-10-04';
const logs = [
  log('aug', '2026-08-31'),
  log('sun-before', '2026-09-27'),
  log('monday', '2026-09-28'),
  log('wed-1', '2026-09-30'),
  log('wed-2', '2026-09-30'),
  log('oct-1', '2026-10-01'),
  log('today', SUNDAY),
];

describe('log ranges', () => {
  it('today keeps only the climbs of that day', () => {
    expect(ids(filterLogs(logs, 'today', SUNDAY))).toEqual(['today']);
    expect(filterLogs(logs, 'today', '2026-10-02')).toEqual([]);
  });

  it('a week runs Monday to Sunday, both ends included', () => {
    expect(ids(filterLogs(logs, 'week', SUNDAY))).toEqual([
      'today',
      'oct-1',
      'wed-2',
      'wed-1',
      'monday',
    ]);
    // A Sunday ends its week: the Monday after it is not in it.
    expect(ids(filterLogs(logs, 'week', '2026-09-27'))).toEqual(['sun-before']);
    // The next Monday starts a new, empty week.
    expect(filterLogs(logs, 'week', '2026-10-05')).toEqual([]);
    expect(rangeBounds('week', '2026-09-30')).toEqual({
      from: '2026-09-28',
      to: '2026-10-04',
    });
  });

  it('a month is the calendar month of today', () => {
    expect(ids(filterLogs(logs, 'month', SUNDAY))).toEqual(['today', 'oct-1']);
    expect(ids(filterLogs(logs, 'month', '2026-09-15'))).toEqual([
      'wed-2',
      'wed-1',
      'monday',
      'sun-before',
    ]);
    expect(rangeBounds('month', '2028-02-10')).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });

  it('all keeps everything, newest first and same-day by entry', () => {
    expect(ids(filterLogs(logs, 'all', SUNDAY))).toEqual([
      'today',
      'oct-1',
      'wed-2',
      'wed-1',
      'monday',
      'sun-before',
      'aug',
    ]);
  });

  it('gives an empty list for an empty log', () => {
    for (const range of ['today', 'week', 'month', 'all'] as const) {
      expect(filterLogs([], range, SUNDAY)).toEqual([]);
    }
  });

  it('opens on this week, or on everything when the week is empty', () => {
    expect(defaultRange(logs, SUNDAY)).toBe('week');
    expect(defaultRange(logs, '2026-10-12')).toBe('all');
    expect(defaultRange([], SUNDAY)).toBe('all');
  });

  it('groups newest-first logs by day with plain headings', () => {
    const groups = groupByDay(filterLogs(logs, 'week', SUNDAY));
    expect(groups.map(g => [g.date, g.logs.length])).toEqual([
      [SUNDAY, 1],
      ['2026-10-01', 1],
      ['2026-09-30', 2],
      ['2026-09-28', 1],
    ]);
    expect(dayHeading(SUNDAY, SUNDAY)).toBe('Today');
    expect(dayHeading('2026-10-03', SUNDAY)).toBe('Yesterday');
    expect(dayHeading('2026-09-30', SUNDAY)).toBe('Wed 30 Sep');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});
