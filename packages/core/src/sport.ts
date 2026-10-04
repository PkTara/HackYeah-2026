/**
 * The engine behind every sport mode after the monkey: the gazelle (running)
 * and the dolphin (swimming). Each sport is a definition in ./sports/, and
 * this file holds the rules they share, which are the monkey's rules:
 *
 * - The profile only describes what was logged ("finished 2 of 4 tempo
 *   runs as planned"). It never predicts times or scores fitness.
 * - A kind with fewer than MIN_SESSIONS logs is "not enough data", never a
 *   weakness. Otherwise the focus is the kind with the lowest finish rate.
 * - One quest at a time for the focus. Quests that load the body pause while
 *   something is flagged sore, and a check-in is offered instead.
 * - XP comes from unique completed quests (progress.ts).
 */
import type { Side } from './game';
import type { PetMode, Unlock } from './progress';

export type SportId = 'run' | 'swim';

/** One logged session: a run or a swim. */
export type SessionLog = Readonly<{
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** One of the sport's three kinds, e.g. 'tempo' or 'backstroke'. */
  kind: string;
  /** One of the sport's places, e.g. 'trail' or 'pool'. */
  place: string;
  /** In the sport's unit: kilometres for running, metres for swimming. */
  distance: number;
  /** Moving time in whole minutes. */
  minutes: number;
  /** Done as planned, or cut short. */
  finished: boolean;
  /** Shipped demo data. The UI labels it as an example. */
  sample?: boolean;
}>;

/** A sore spot. The athlete's own note, not a diagnosis. */
export type BodyFlag = Readonly<{
  side: Side;
  /** One of the sport's body parts, e.g. 'knee' or 'shoulder'. */
  part: string;
  /** When it was first flagged. */
  date: string;
}>;

export type SportQuestKind = 'log' | 'practice' | 'plan' | 'checkin';

export type SportQuest = Readonly<{
  id: string;
  kind: SportQuestKind;
  /** Which focus kind it serves. Undefined means any. */
  sessionKind?: string;
  title: string;
  /** What to do, in one or two sentences. */
  task: string;
  /** Why it fits the current focus. */
  why: string;
  minutes: number;
  equipment: string;
  /** Means running or swimming. Paused while something is flagged. */
  loadsBody: boolean;
  /** Only offered while something is flagged. */
  needsFlag?: boolean;
}>;

/** Everything one sport mode remembers. */
export type SportState = Readonly<{
  version: 1;
  logs: readonly SessionLog[];
  flags: readonly BodyFlag[];
  /** Ids of completed quests. This pet's XP is derived from these. */
  completed: readonly string[];
  /** Ids of quests swapped away, oldest first. */
  skipped: readonly string[];
}>;

export type Sport = Readonly<{
  id: SportId;
  /** The pet that leads this sport. */
  pet: Exclude<PetMode, 'monkey'>;
  /** Three kinds, clockwise from the top of the profile triangle. */
  kinds: readonly [string, string, string];
  places: readonly string[];
  bodyParts: readonly string[];
  unit: 'km' | 'm';
  quests: readonly SportQuest[];
  unlocks: readonly Unlock[];
  /** What a fresh install starts with, every log marked as an example. */
  sample: SportState;
  /** "6:12 /km" or "2:05 /100 m", or null without distance or time. */
  pace: (distance: number, minutes: number) => string | null;
}>;

/** Below this many logs a kind is "not enough data", never a weakness. */
export const MIN_SESSIONS = 3;

export type SessionTally = Readonly<{
  logged: number;
  finished: number;
  /** Share finished as planned, or null below MIN_SESSIONS. */
  rate: number | null;
  /** Total distance in the sport's unit, to one decimal. */
  distance: number;
}>;

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

export function tally(logs: readonly SessionLog[]): SessionTally {
  const finished = logs.filter(log => log.finished).length;
  return {
    logged: logs.length,
    finished,
    rate: logs.length >= MIN_SESSIONS ? finished / logs.length : null,
    distance: oneDecimal(logs.reduce((sum, log) => sum + log.distance, 0)),
  };
}

/** One tally per value of `key` (kind or place), in the order given. */
export function talliesBy(
  logs: readonly SessionLog[],
  key: 'kind' | 'place',
  values: readonly string[],
): Record<string, SessionTally> {
  return Object.fromEntries(
    values.map(v => [v, tally(logs.filter(log => log[key] === v))]),
  );
}

export type SportFocus = Readonly<{
  /** explore: too few logs of this kind. practice: lowest finish rate. */
  kind: 'explore' | 'practice';
  sessionKind: string;
  tally: SessionTally;
}>;

export function pickSportFocus(
  logs: readonly SessionLog[],
  kinds: readonly string[],
): SportFocus {
  const tallies = talliesBy(logs, 'kind', kinds);

  const thin = kinds.filter(k => tallies[k].rate === null);
  if (thin.length > 0) {
    const k = thin.reduce((a, b) =>
      tallies[b].logged < tallies[a].logged ? b : a,
    );
    return { kind: 'explore', sessionKind: k, tally: tallies[k] };
  }

  const k = kinds.reduce((a, b) =>
    (tallies[b].rate ?? 1) < (tallies[a].rate ?? 1) ? b : a,
  );
  return { kind: 'practice', sessionKind: k, tally: tallies[k] };
}

export type SportQuestPick = Readonly<{
  /** The quest to show, or null when nothing is left to do. */
  quest: SportQuest | null;
  /** Quests that fit the focus but wait until the flag is cleared. */
  paused: readonly SportQuest[];
  /** Every quest that could be offered right now, in order. */
  options: readonly SportQuest[];
}>;

/** Same rule as the monkey's pickQuest, over the sport's own library. */
export function pickSportQuest(
  quests: readonly SportQuest[],
  focus: SportFocus,
  opts: Readonly<{
    hasFlag: boolean;
    completed: readonly string[];
    skipped: readonly string[];
  }>,
): SportQuestPick {
  const fitsFocus = (q: SportQuest) =>
    focus.kind === 'explore'
      ? q.kind === 'log' && q.sessionKind === focus.sessionKind
      : q.kind !== 'log' &&
        (q.sessionKind === undefined || q.sessionKind === focus.sessionKind);

  const candidates = quests.filter(
    q =>
      fitsFocus(q) &&
      !opts.completed.includes(q.id) &&
      (!q.needsFlag || opts.hasFlag),
  );
  const paused = opts.hasFlag ? candidates.filter(q => q.loadsBody) : [];
  const eligible = candidates.filter(q => !paused.includes(q));
  const skipRank = (q: SportQuest) => opts.skipped.indexOf(q.id);
  const options = [...eligible]
    .sort((a, b) => Number(Boolean(b.needsFlag)) - Number(Boolean(a.needsFlag)))
    .sort((a, b) => skipRank(a) - skipRank(b));

  return { quest: options[0] ?? null, paused, options };
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Distance logged in the 7 days ending today, to one decimal. */
export function weekDistance(
  logs: readonly SessionLog[],
  today: string,
): number {
  const end = dayNumber(today);
  return oneDecimal(
    logs
      .filter(log => {
        const age = end - dayNumber(log.date);
        return age >= 0 && age < 7;
      })
      .reduce((sum, log) => sum + log.distance, 0),
  );
}

/** "m:ss" for a number of seconds. */
export function clock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export type SportAction =
  | { type: 'logSession'; log: SessionLog }
  | { type: 'removeSession'; id: string }
  | { type: 'completeQuest'; questId: string }
  | { type: 'skipQuest'; questId: string }
  /** Explicit on/off (not a toggle) so repeating it is harmless. */
  | { type: 'setFlag'; flag: BodyFlag; flagged: boolean }
  | { type: 'load'; state: SportState }
  | { type: 'reset'; state: SportState };

export const emptySport: SportState = {
  version: 1,
  logs: [],
  flags: [],
  completed: [],
  skipped: [],
};

export function sportReducer(
  state: SportState,
  action: SportAction,
): SportState {
  switch (action.type) {
    case 'logSession':
      return { ...state, logs: [...state.logs, action.log] };
    case 'removeSession':
      return { ...state, logs: state.logs.filter(l => l.id !== action.id) };
    case 'completeQuest':
      if (state.completed.includes(action.questId)) {
        return state; // already counted, no double XP
      }
      return {
        ...state,
        completed: [...state.completed, action.questId],
        skipped: state.skipped.filter(id => id !== action.questId),
      };
    case 'skipQuest':
      return {
        ...state,
        skipped: [
          ...state.skipped.filter(id => id !== action.questId),
          action.questId,
        ],
      };
    case 'setFlag': {
      const same = (f: BodyFlag) =>
        f.side === action.flag.side && f.part === action.flag.part;
      if (!action.flagged) {
        return { ...state, flags: state.flags.filter(f => !same(f)) };
      }
      if (state.flags.some(same)) {
        return state; // keeps the date it was first flagged
      }
      return { ...state, flags: [...state.flags, action.flag] };
    }
    case 'load':
    case 'reset':
      return action.state;
  }
}

/** Accepts saved JSON only if it looks like a SportState; otherwise null. */
export function parseSportState(json: string | null): SportState | null {
  if (!json) {
    return null;
  }
  try {
    const value = JSON.parse(json);
    const ok =
      value?.version === 1 &&
      Array.isArray(value.logs) &&
      Array.isArray(value.flags) &&
      Array.isArray(value.completed) &&
      Array.isArray(value.skipped);
    return ok ? { ...emptySport, ...value } : null;
  } catch {
    return null;
  }
}

/** Turns compact sample rows into labelled example logs. */
export function sampleSessions(
  prefix: string,
  rows: readonly (readonly [string, string, string, number, number, boolean])[],
): SessionLog[] {
  return rows.map(([date, kind, place, distance, minutes, finished], i) => ({
    id: `${prefix}-${i + 1}`,
    date,
    kind,
    place,
    distance,
    minutes,
    finished,
    sample: true,
  }));
}
