/**
 * Plain counting over sessions for the export sheets. These are app
 * arithmetic, not research: no ratios, scores or risk.
 */
import type { ExportSession } from './types';

export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** "2026-10-04" plus a number of days, as YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date((dayNumber(date) + days) * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}`;
}

/** Days from `from` to `to`, both included. At least 1. */
export function daysBetween(from: string, to: string): number {
  return Math.max(1, dayNumber(to) - dayNumber(from) + 1);
}

export function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/** "3", "2.5", "0.3": one decimal at most, no trailing ".0". */
export function round1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Whole numbers from 10 up, one decimal below. */
export function roundNice(n: number): string {
  return n >= 10 ? String(Math.round(n)) : round1(n);
}

export function activeDays(sessions: readonly ExportSession[]): number {
  return new Set(sessions.map(s => s.date)).size;
}

export function perWeek(count: number, days: number): number {
  return (count * 7) / days;
}

export function sum(values: readonly (number | null)[]): number {
  return values.reduce<number>((total, v) => total + (v ?? 0), 0);
}

export type Week = Readonly<{
  start: string;
  end: string;
  sessions: readonly ExportSession[];
}>;

/** Weeks ending on `to`, newest first. */
export function weeklyRows(
  sessions: readonly ExportSession[],
  to: string,
  weeks: number,
): Week[] {
  return Array.from({ length: weeks }, (_, i) => {
    const end = addDays(to, -7 * i);
    const start = addDays(end, -6);
    return {
      start,
      end,
      sessions: sessions.filter(s => inRange(s.date, start, end)),
    };
  });
}

export type KindCount = Readonly<{
  kind: string;
  logged: number;
  done: number;
}>;

export function byKind(
  sessions: readonly ExportSession[],
  kinds: readonly string[],
): KindCount[] {
  return kinds.map(kind => {
    const of = sessions.filter(s => s.kind === kind);
    return { kind, logged: of.length, done: of.filter(s => s.done).length };
  });
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Sessions per weekday, Monday first. */
export function weekdayCounts(sessions: readonly ExportSession[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    // Day 0 of the epoch was a Thursday.
    counts[(dayNumber(s.date) + 3) % 7] += 1;
  }
  return counts;
}

/** Days in the period with nothing logged. */
export function restDays(
  sessions: readonly ExportSession[],
  from: string,
  to: string,
): number {
  return daysBetween(from, to) - activeDays(sessions);
}

/** The window before a date and the time since it, as plain counts. */
export function beforeAndSince(
  sessions: readonly ExportSession[],
  since: string,
  today: string,
  beforeDays = 28,
): Readonly<{
  before: readonly ExportSession[];
  after: readonly ExportSession[];
  beforeFrom: string;
  afterDays: number;
}> {
  const beforeFrom = addDays(since, -beforeDays);
  return {
    before: sessions.filter(s => inRange(s.date, beforeFrom, addDays(since, -1))),
    after: sessions.filter(s => inRange(s.date, since, today)),
    beforeFrom,
    afterDays: daysBetween(since, today),
  };
}

/** The n longest sessions by moving time. Sessions without time drop out. */
export function longest(
  sessions: readonly ExportSession[],
  n: number,
): ExportSession[] {
  return sessions
    .filter(s => s.minutes !== null)
    .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
    .slice(0, n);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "27 September", for the family update. */
export function longDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
