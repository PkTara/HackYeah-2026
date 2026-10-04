/**
 * Climb records and the profile rules built on them.
 *
 * The profile only describes what was logged ("sent 2 of 6 vertical climbs").
 * It does not predict grades or score ability.
 */

export type Terrain = 'slab' | 'vertical' | 'overhang';
/** Style of a climb. A climb can use several styles. */
export type Movement =
  | 'controlled'
  | 'dynamic'
  | 'technical'
  | 'powerful'
  | 'balance'
  | 'coordination'
  | 'compression'
  | 'endurance';
export type HoldType =
  | 'jug'
  | 'crimp'
  | 'sloper'
  | 'pinch'
  | 'pocket'
  | 'volume';

export const TERRAINS: readonly Terrain[] = ['slab', 'vertical', 'overhang'];
export const MOVEMENTS: readonly Movement[] = [
  'controlled',
  'dynamic',
  'technical',
  'powerful',
  'balance',
  'coordination',
  'compression',
  'endurance',
];
export const HOLD_TYPES: readonly HoldType[] = [
  'jug',
  'crimp',
  'sloper',
  'pinch',
  'pocket',
  'volume',
];

export type ClimbLog = Readonly<{
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  terrain: Terrain;
  /** All movement styles used on the climb. */
  movements: readonly Movement[];
  /** Hold types on the climb. Optional, may be empty. */
  holds: readonly HoldType[];
  /** Grade as written at the gym, e.g. "V3". */
  grade: string;
  sent: boolean;
  /** Shipped demo data. The UI labels it as an example. */
  sample?: boolean;
}>;

/** Below this many logs a style is "not enough data", never a weakness. */
export const MIN_LOGS = 3;

export type Tally = Readonly<{
  logged: number;
  sent: number;
  /** Share of logged climbs that were sent, or null with fewer than MIN_LOGS. */
  rate: number | null;
}>;

function tally(logs: readonly ClimbLog[]): Tally {
  const sent = logs.filter(log => log.sent).length;
  return {
    logged: logs.length,
    sent,
    rate: logs.length >= MIN_LOGS ? sent / logs.length : null,
  };
}

export function terrainTallies(
  logs: readonly ClimbLog[],
): Record<Terrain, Tally> {
  return {
    slab: tally(logs.filter(log => log.terrain === 'slab')),
    vertical: tally(logs.filter(log => log.terrain === 'vertical')),
    overhang: tally(logs.filter(log => log.terrain === 'overhang')),
  };
}

export function movementTallies(
  logs: readonly ClimbLog[],
): Record<Movement, Tally> {
  return Object.fromEntries(
    MOVEMENTS.map(movement => [
      movement,
      tally(logs.filter(log => log.movements.includes(movement))),
    ]),
  ) as Record<Movement, Tally>;
}

/** One cell of the terrain x movement grid. */
export function cellTally(
  logs: readonly ClimbLog[],
  terrain: Terrain,
  movement: Movement,
): Tally {
  return tally(
    logs.filter(
      log => log.terrain === terrain && log.movements.includes(movement),
    ),
  );
}

export type Focus =
  /** Not enough climbs logged on this terrain to say anything yet. */
  | Readonly<{ kind: 'explore'; terrain: Terrain; tally: Tally }>
  /** Lowest send rate of the three terrains. */
  | Readonly<{ kind: 'practice'; terrain: Terrain; tally: Tally }>;

/**
 * Rule v1: if a terrain has too few logs, ask for more logs on it first.
 * Otherwise focus on the terrain with the lowest send rate.
 */
export function pickFocus(logs: readonly ClimbLog[]): Focus {
  const tallies = terrainTallies(logs);

  const thin = TERRAINS.filter(t => tallies[t].rate === null);
  if (thin.length > 0) {
    const terrain = thin.reduce((a, b) =>
      tallies[b].logged < tallies[a].logged ? b : a,
    );
    return { kind: 'explore', terrain, tally: tallies[terrain] };
  }

  const terrain = TERRAINS.reduce((a, b) =>
    (tallies[b].rate ?? 1) < (tallies[a].rate ?? 1) ? b : a,
  );
  return { kind: 'practice', terrain, tally: tallies[terrain] };
}

/**
 * Brings a saved climb up to date. Climbs saved before style became
 * multi-select have a single `movement` and no `holds`.
 */
export function normalizeClimbLog(raw: unknown): ClimbLog {
  const log = raw as ClimbLog & { movement?: Movement };
  const movements = Array.isArray(log.movements)
    ? log.movements
    : log.movement
    ? [log.movement]
    : [];
  return {
    id: log.id,
    date: log.date,
    terrain: log.terrain,
    movements,
    holds: Array.isArray(log.holds) ? log.holds : [],
    grade: log.grade,
    sent: log.sent,
    ...(log.sample ? { sample: true } : {}),
  };
}
