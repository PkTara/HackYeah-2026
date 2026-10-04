/**
 * Gazelle mode: run records and the profile rules built on them.
 *
 * Mirrors climbing.ts. The profile only describes what was logged ("finished
 * 2 of 4 tempo runs as planned"). It does not predict race times or score
 * fitness.
 */
import type { Side } from './game';

/** Kind of run. Each run is exactly one. */
export type RunType = 'easy' | 'tempo' | 'long';
export type Surface = 'road' | 'trail' | 'track';

export const RUN_TYPES: readonly RunType[] = ['easy', 'tempo', 'long'];
export const SURFACES: readonly Surface[] = ['road', 'trail', 'track'];

export type RunLog = Readonly<{
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  type: RunType;
  surface: Surface;
  /** Distance in kilometres, e.g. 5.2. */
  km: number;
  /** Moving time in whole minutes. */
  minutes: number;
  /** Ran the whole run as planned, or cut it short. */
  finished: boolean;
  /** Shipped demo data. The UI labels it as an example. */
  sample?: boolean;
}>;

/** Below this many runs a type is "not enough data", never a weakness. */
export const MIN_RUNS = 3;

export type RunTally = Readonly<{
  logged: number;
  finished: number;
  /** Share of logged runs finished as planned, or null below MIN_RUNS. */
  rate: number | null;
  km: number;
}>;

function tally(runs: readonly RunLog[]): RunTally {
  const finished = runs.filter(run => run.finished).length;
  return {
    logged: runs.length,
    finished,
    rate: runs.length >= MIN_RUNS ? finished / runs.length : null,
    km: Math.round(runs.reduce((sum, run) => sum + run.km, 0) * 10) / 10,
  };
}

export function runTallies(runs: readonly RunLog[]): Record<RunType, RunTally> {
  return {
    easy: tally(runs.filter(run => run.type === 'easy')),
    tempo: tally(runs.filter(run => run.type === 'tempo')),
    long: tally(runs.filter(run => run.type === 'long')),
  };
}

export function surfaceTallies(
  runs: readonly RunLog[],
): Record<Surface, RunTally> {
  return {
    road: tally(runs.filter(run => run.surface === 'road')),
    trail: tally(runs.filter(run => run.surface === 'trail')),
    track: tally(runs.filter(run => run.surface === 'track')),
  };
}

export type RunFocus =
  /** Not enough runs of this type logged to say anything yet. */
  | Readonly<{ kind: 'explore'; type: RunType; tally: RunTally }>
  /** Lowest finish rate of the three run types. */
  | Readonly<{ kind: 'practice'; type: RunType; tally: RunTally }>;

/**
 * Same rule as the monkey's: if a run type has too few logs, ask for more of
 * it first. Otherwise focus on the type with the lowest finish rate.
 */
export function pickRunFocus(runs: readonly RunLog[]): RunFocus {
  const tallies = runTallies(runs);

  const thin = RUN_TYPES.filter(t => tallies[t].rate === null);
  if (thin.length > 0) {
    const type = thin.reduce((a, b) =>
      tallies[b].logged < tallies[a].logged ? b : a,
    );
    return { kind: 'explore', type, tally: tallies[type] };
  }

  const type = RUN_TYPES.reduce((a, b) =>
    (tallies[b].rate ?? 1) < (tallies[a].rate ?? 1) ? b : a,
  );
  return { kind: 'practice', type, tally: tallies[type] };
}

/** "6:05 /km", or null when distance or time is missing. */
export function paceText(km: number, minutes: number): string | null {
  if (!(km > 0) || !(minutes > 0)) {
    return null;
  }
  const secondsPerKm = Math.round((minutes * 60) / km);
  const m = Math.floor(secondsPerKm / 60);
  const s = String(secondsPerKm % 60).padStart(2, '0');
  return `${m}:${s} /km`;
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Kilometres logged in the 7 days ending today, to one decimal. */
export function weekKm(runs: readonly RunLog[], today: string): number {
  const end = dayNumber(today);
  const km = runs
    .filter(run => {
      const age = end - dayNumber(run.date);
      return age >= 0 && age < 7;
    })
    .reduce((sum, run) => sum + run.km, 0);
  return Math.round(km * 10) / 10;
}

/** Where a leg is sore. The runner's own note, not a diagnosis. */
export type LegPart = 'hip' | 'knee' | 'shin' | 'calf' | 'ankle' | 'foot';
export const LEG_PARTS: readonly LegPart[] = [
  'hip',
  'knee',
  'shin',
  'calf',
  'ankle',
  'foot',
];

export type LegFlag = Readonly<{
  side: Side;
  part: LegPart;
  /** When it was first flagged. */
  date: string;
}>;
