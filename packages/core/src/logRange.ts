/**
 * Date filters for the Log tabs: today, this week, this month or
 * everything. Dates are local YYYY-MM-DD strings, so plain string order is
 * date order. A week runs Monday to Sunday.
 */
import { shortDate } from './dates';

export type LogRange = 'today' | 'week' | 'month' | 'all';

type Dated = Readonly<{ date: string }>;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function utc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The date `days` after `date` (before, when negative). */
export function addDays(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** 0 for Monday up to 6 for Sunday. */
function weekday(date: string): number {
  return (utc(date).getUTCDay() + 6) % 7;
}

/** First and last day of the range around today, both included. */
export function rangeBounds(
  range: LogRange,
  today: string,
): Readonly<{ from: string; to: string }> | null {
  switch (range) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const from = addDays(today, -weekday(today));
      return { from, to: addDays(from, 6) };
    }
    case 'month': {
      const from = `${today.slice(0, 8)}01`;
      const [y, m] = today.split('-').map(Number);
      // Day 0 of the next month is the last day of this one.
      return { from, to: iso(new Date(Date.UTC(y, m, 0))) };
    }
    default:
      return null;
  }
}

/** Newest first; logs from the same day keep newest-entered first. */
export function newestFirst<T extends Dated>(logs: readonly T[]): T[] {
  return [...logs].reverse().sort((a, b) => b.date.localeCompare(a.date));
}

/** The logs in the range, newest first. */
export function filterLogs<T extends Dated>(
  logs: readonly T[],
  range: LogRange,
  today: string,
): T[] {
  const bounds = rangeBounds(range, today);
  return newestFirst(
    bounds
      ? logs.filter(log => log.date >= bounds.from && log.date <= bounds.to)
      : logs,
  );
}

/** This week when it has any logs, otherwise everything. */
export function defaultRange(logs: readonly Dated[], today: string): LogRange {
  return filterLogs(logs, 'week', today).length > 0 ? 'week' : 'all';
}

/** Logs that are already newest first, split into one group per day. */
export function groupByDay<T extends Dated>(
  logs: readonly T[],
): Readonly<{ date: string; logs: readonly T[] }>[] {
  const groups: { date: string; logs: T[] }[] = [];
  for (const log of logs) {
    const last = groups[groups.length - 1];
    if (last && last.date === log.date) {
      last.logs.push(log);
    } else {
      groups.push({ date: log.date, logs: [log] });
    }
  }
  return groups;
}

/** "Today", "Yesterday", "Wed 30 Sep". */
export function dayHeading(date: string, today: string): string {
  if (date === today) {
    return 'Today';
  }
  if (date === addDays(today, -1)) {
    return 'Yesterday';
  }
  return `${WEEKDAYS[weekday(date)]} ${shortDate(date)}`;
}
