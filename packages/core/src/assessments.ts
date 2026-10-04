import { isDecisionExplanation, type DecisionExplanation } from './evidence';

/** Measurements retain their protocol and setup so changes compare like with like. */
export type AssessmentMetric =
  | 'leg_spread'
  | 'shoulder_reach_left'
  | 'shoulder_reach_right'
  | 'finger_force'
  | 'height'
  | 'arm_span'
  | 'pullups'
  | 'hang_duration';
export type AssessmentUnit =
  | 'degrees'
  | 'cm'
  | 'repetitions'
  | 'seconds'
  | 'N'
  | 'kgf';
export const FINGER_INSTRUMENT_MAX_LENGTH = 120;

export type FingerForceSetup = Readonly<{
  instrument: string;
  grip: 'open_hand' | 'half_crimp' | 'full_crimp';
  edge_mm: number;
  arm_position: 'straight' | 'bent';
  effort_seconds: number;
}>;
export type AssessmentRecord = Readonly<{
  id: string;
  metric: AssessmentMetric;
  value: number;
  unit: AssessmentUnit;
  method: 'manual' | 'camera';
  protocol: string;
  occurredAt: string;
  confidence?: number;
  modelVersion?: string;
  side?: 'left' | 'right' | 'both';
  setup?: FingerForceSetup;
  simulated?: boolean;
  /** Reviewed explanation snapshot; a user report, not verified provenance. */
  decision?: DecisionExplanation;
}>;

const METRIC_UNITS: Readonly<
  Record<AssessmentMetric, readonly AssessmentUnit[]>
> = {
  leg_spread: ['degrees'],
  shoulder_reach_left: ['degrees'],
  shoulder_reach_right: ['degrees'],
  finger_force: ['N', 'kgf'],
  height: ['cm'],
  arm_span: ['cm'],
  pullups: ['repetitions'],
  hang_duration: ['seconds'],
};
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function isFingerForceSetup(value: unknown): value is FingerForceSetup {
  const setup = value as Partial<FingerForceSetup> | null;
  return (
    !!setup &&
    typeof setup.instrument === 'string' &&
    !!setup.instrument.trim() &&
    setup.instrument.trim().length <= FINGER_INSTRUMENT_MAX_LENGTH &&
    ['open_hand', 'half_crimp', 'full_crimp'].includes(setup.grip ?? '') &&
    ['straight', 'bent'].includes(setup.arm_position ?? '') &&
    positive(setup.edge_mm) &&
    positive(setup.effort_seconds)
  );
}

/** Invalid stored readings cannot become a profile measurement. */
export function isAssessmentRecord(value: unknown): value is AssessmentRecord {
  const record = value as Partial<AssessmentRecord> | null;
  if (
    !record ||
    typeof record.id !== 'string' ||
    !record.id ||
    typeof record.metric !== 'string' ||
    !Object.prototype.hasOwnProperty.call(METRIC_UNITS, record.metric) ||
    typeof record.value !== 'number' ||
    !Number.isFinite(record.value) ||
    record.value < 0 ||
    !METRIC_UNITS[record.metric].includes(record.unit as AssessmentUnit) ||
    !['manual', 'camera'].includes(record.method ?? '') ||
    typeof record.protocol !== 'string' ||
    !record.protocol.trim() ||
    typeof record.occurredAt !== 'string' ||
    !Number.isFinite(Date.parse(record.occurredAt)) ||
    (record.side !== undefined &&
      !['left', 'right', 'both'].includes(record.side)) ||
    (record.simulated !== undefined && typeof record.simulated !== 'boolean') ||
    (record.modelVersion !== undefined &&
      typeof record.modelVersion !== 'string') ||
    (record.confidence !== undefined &&
      (typeof record.confidence !== 'number' ||
        !Number.isFinite(record.confidence) ||
        record.confidence < 0 ||
        record.confidence > 1)) ||
    (record.decision !== undefined &&
      !isDecisionExplanation(record.decision)) ||
    (record.setup !== undefined && !isFingerForceSetup(record.setup))
  ) {
    return false;
  }
  if (record.unit === 'degrees' && record.value > 180) {
    return false;
  }
  if (
    record.method === 'camera' &&
    (!['leg_spread', 'shoulder_reach_left', 'shoulder_reach_right'].includes(
      record.metric,
    ) ||
      record.confidence === undefined ||
      record.confidence < 0.7)
  ) {
    return false;
  }
  if (
    record.metric.startsWith('shoulder_reach_') &&
    record.side !== undefined &&
    !record.metric.endsWith(`_${record.side}`)
  ) {
    return false;
  }
  return (
    record.metric !== 'finger_force' ||
    (record.method === 'manual' &&
      positive(record.value) &&
      !!record.side &&
      isFingerForceSetup(record.setup))
  );
}

export function parseAssessmentRecords(value: unknown): AssessmentRecord[] {
  return Array.isArray(value) ? value.filter(isAssessmentRecord) : [];
}

export type AssessmentComparison = Readonly<{
  latest: AssessmentRecord;
  previous: AssessmentRecord | null;
  change: number | null;
}>;
/** Each group keeps its latest and preceding reading, ordered by measurement date. */
export function comparableAssessments(
  records: readonly AssessmentRecord[],
): AssessmentComparison[] {
  const groups = new Map<string, AssessmentRecord[]>();
  for (const record of records) {
    const setup = record.setup;
    const key = JSON.stringify([
      record.metric,
      record.unit,
      record.method,
      record.protocol,
      record.side ?? null,
      record.simulated === true,
      setup
        ? [
            setup.instrument,
            setup.grip,
            setup.edge_mm,
            setup.arm_position,
            setup.effort_seconds,
          ]
        : null,
    ]);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(group => {
      const ordered = [...group].sort(
        (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
      );
      const latest = ordered[0];
      const previous = ordered[1] ?? null;
      return {
        latest,
        previous,
        change: previous ? latest.value - previous.value : null,
      };
    })
    .sort(
      (a, b) =>
        Date.parse(b.latest.occurredAt) - Date.parse(a.latest.occurredAt),
    );
}
