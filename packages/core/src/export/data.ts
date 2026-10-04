/**
 * Machine-readable files: JSON with a schema version and CSV for
 * spreadsheets. Every record says where it came from. Record ids appear
 * here, for tracing, and in no human format.
 */
import { NOT_THIS } from './audiences';
import { noDashes } from './render';
import type { ExportSnapshot } from './types';

export function toJson(s: ExportSnapshot): string {
  const data = {
    schema: s.schema,
    generatedOn: s.generatedOn,
    mode: s.mode,
    containsExamples: s.containsExamples,
    demoProfile: s.demoProfile,
    disclaimer: NOT_THIS.data,
    period: { from: s.period.from, to: s.period.to, weeks: s.period.weeks },
    units: {
      distance: s.mode === 'climb' ? null : s.words.unit,
      duration: s.mode === 'climb' ? null : 'min',
    },
    notRecorded:
      s.mode === 'climb'
        ? ['session time', 'effort', 'pain rating']
        : ['effort', 'pain rating'],
    sessions: s.sessions.map(x => ({
      id: x.id,
      date: x.date,
      kind: x.kind,
      place: x.place,
      distance: x.distance,
      unit: x.unit,
      minutes: x.minutes,
      outcome: x.done ? s.words.doneWord : s.words.notDoneWord,
      grade: x.grade,
      styles: x.styles,
      holds: x.holds,
      provenance: x.provenance,
    })),
    flags: s.flags.map(f => ({
      side: f.side,
      part: f.part,
      spots: f.spots,
      since: f.since,
      provenance: f.provenance,
    })),
    measurements: s.measurements.map(m => ({
      id: m.id,
      date: m.date,
      metric: m.metric,
      value: m.value,
      unit: m.unit,
      method: m.method,
      protocol: m.protocol,
      side: m.side,
      setup: m.setup,
      previous: m.previous,
      provenance: m.provenance,
    })),
    derived: {
      focus: {
        kind: s.focus.kind,
        name: s.focus.name,
        rule: s.focus.rule,
        provenance: 'app_rule',
      },
      quest: s.quest
        ? {
            id: s.quest.id,
            title: s.quest.title,
            draft: s.quest.draft,
            provenance: 'app_rule',
          }
        : null,
      paused: s.paused,
    },
    progress: {
      level: s.progress.level,
      xp: s.progress.xp,
      completedQuestIds: s.progress.completedQuestIds,
      note: 'XP is a game reward. It does not measure fitness.',
    },
  };
  return noDashes(JSON.stringify(data, null, 2)) + '\n';
}

/**
 * One CSV cell (RFC 4180). Text that a spreadsheet would read as a
 * formula gets a leading quote mark, because grades and gauge names are
 * free text. Numbers are written as they are.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) || guarded !== guarded.trim()
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

function csv(rows: readonly (readonly (string | number | null)[])[]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export const SESSION_COLUMNS = [
  'date',
  'mode',
  'kind',
  'place',
  'distance',
  'unit',
  'minutes',
  'outcome',
  'grade',
  'styles',
  'holds',
  'provenance',
] as const;

/** One row per session in the chosen period, newest first. */
export function toSessionsCsv(s: ExportSnapshot): string {
  return csv([
    SESSION_COLUMNS,
    ...s.sessions.map(x => [
      x.date,
      s.mode,
      x.kind,
      x.place,
      x.distance,
      x.unit,
      x.minutes,
      x.done ? s.words.doneWord : s.words.notDoneWord,
      x.grade,
      x.styles.join(';'),
      x.holds.join(';'),
      x.provenance,
    ]),
  ]);
}

export const MEASUREMENT_COLUMNS = [
  'date',
  'metric',
  'value',
  'unit',
  'method',
  'protocol',
  'side',
  'setup',
  'provenance',
] as const;

export function toMeasurementsCsv(s: ExportSnapshot): string {
  return csv([
    MEASUREMENT_COLUMNS,
    ...s.measurements.map(m => [
      m.date,
      m.metric,
      m.value,
      m.unit,
      m.method,
      m.protocol,
      m.side,
      m.setup,
      m.provenance,
    ]),
  ]);
}
