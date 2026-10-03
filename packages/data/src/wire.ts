/**
 * The JSON the Climbing Monkey API accepts and sends, and how it maps to app
 * types. Request bodies follow backend/src/climbing_monkey/schemas.py; the
 * server answers with the stored record: the request fields plus its own
 * `id`, with `occurred_at` in UTC.
 *
 * The server owns quests, XP and its rules. This file only translates.
 */
import {
  toLocalDate,
  type BaselineResult,
  type BaselineTestId,
  type Body,
  type ClimbingGoal,
  type ClimbLog,
  type Finger,
  type GameState,
  type HandFlag,
  type HoldType,
  type Movement,
  type OnboardingResult,
  type Quest,
  type QuestKind,
  type Reach,
  type Side,
  type Terrain,
} from '@hackyeah/core';
import { BackendError } from './backend';
import type { DeviceData } from './device';

/** The device's calendar date (YYYY-MM-DD) of a server timestamp. */
export function localDate(timestamp: string): string {
  return toLocalDate(new Date(timestamp));
}

// Identity

/** The four goals the server knows. Its quest rules read them. */
export type ServerGoal = 'general' | 'technique' | 'mobility' | 'endurance';

/**
 * Setup offers five goals; the server knows four.
 * - harder-grades, more-styles: technique (both are about how you climb)
 * - injury-free: mobility (the server then asks for comparable measurements)
 * - finger-strength: endurance (the closest of the four)
 * - climb-more: general
 */
export const SERVER_GOAL: Readonly<Record<ClimbingGoal, ServerGoal>> = {
  'harder-grades': 'technique',
  'more-styles': 'technique',
  'injury-free': 'mobility',
  'finger-strength': 'endurance',
  'climb-more': 'general',
};

export type NewClimberBody = { name: string; goal: ServerGoal };
export type ClimberUpdateBody = { goal: ServerGoal };
/** The answer to createClimber. This is the only time the token is sent. */
export type NewClimberDto = {
  id: string;
  name: string;
  goal: ServerGoal;
  pet_visible: boolean;
  token: string;
};

// Climbs

export type ClimbBody = {
  terrain: Terrain;
  /** The first of movements, for servers that only read one. */
  movement?: Movement;
  movements: Movement[];
  holds: HoldType[];
  completed: boolean;
  grade: string | null;
  grade_system: 'V';
  occurred_at: string;
};

export type ClimbDto = {
  id: string;
  occurred_at: string;
  terrain: Terrain;
  movement: Movement;
  /** Missing on climbs saved before the server kept both styles. */
  movements?: Movement[];
  /** Missing on climbs saved before the server kept holds. */
  holds?: HoldType[];
  completed: boolean;
  /** The app does not ask; null means not recorded. */
  attempts?: number | null;
  grade: string | null;
  grade_system: string | null;
  location: string | null;
};

/**
 * A log only has a date, so it is sent at noon UTC, which is the same
 * calendar day in nearly every time zone.
 */
export function toClimbBody(log: ClimbLog): ClimbBody {
  return {
    terrain: log.terrain,
    movement: log.movements[0],
    movements: [...log.movements],
    holds: [...log.holds],
    completed: log.sent,
    grade: log.grade || null,
    grade_system: 'V',
    occurred_at: `${log.date}T12:00:00Z`,
  };
}

export function fromClimbDto(dto: ClimbDto): ClimbLog {
  return {
    id: dto.id,
    date: localDate(dto.occurred_at),
    terrain: dto.terrain,
    movements: dto.movements?.length ? dto.movements : [dto.movement],
    holds: dto.holds ?? [],
    grade: dto.grade ?? '',
    sent: dto.completed,
  };
}

// Hands

export type HandRegion =
  | 'thumb'
  | 'index_finger'
  | 'middle_finger'
  | 'ring_finger'
  | 'little_finger'
  | 'palm'
  | 'back'
  | 'wrist';

export const FINGER_REGION: Readonly<Record<Finger, HandRegion>> = {
  thumb: 'thumb',
  index: 'index_finger',
  middle: 'middle_finger',
  ring: 'ring_finger',
  little: 'little_finger',
};

/** The app flags fingers only, so palm, back and wrist reports are left out. */
const REGION_FINGER: Readonly<Partial<Record<HandRegion, Finger>>> = {
  thumb: 'thumb',
  index_finger: 'index',
  middle_finger: 'middle',
  ring_finger: 'ring',
  little_finger: 'little',
};

export type HandReportBody = {
  side: Side;
  region: HandRegion;
  /** null: sore, intensity not rated. 0: no discomfort, clears the finger. */
  pain: number | null;
  /** Where it hurts, as spot ids from core's spots.ts. */
  spots?: string[];
  occurred_at: string;
};

export type HandReportDto = {
  id: string;
  occurred_at: string;
  side: Side;
  region: HandRegion;
  pain: number | null;
  /** Missing on reports saved before the server kept spots. */
  spots?: string[];
  note?: string;
};

/** Every change is a new report: flagging is "sore, not rated" plus the spots. */
export function toHandReportBody(
  flag: HandFlag,
  flagged: boolean,
  at: Date,
): HandReportBody {
  const report = {
    side: flag.side,
    region: FINGER_REGION[flag.finger],
    occurred_at: at.toISOString(),
  };
  return flagged
    ? { ...report, pain: null, spots: [...flag.spots] }
    : { ...report, pain: 0 };
}

/**
 * The current finger flags, from every report the server has (oldest first).
 *
 * The latest report per finger decides: pain null or above 0 is a flag, 0
 * clears it. A flag is dated by the first report of its current run of sore
 * reports, so editing the spots keeps the day it was first flagged; its spots
 * come from the latest report. Flags are listed in the order they started.
 */
export function flagsFromHandReports(
  reports: readonly HandReportDto[],
): HandFlag[] {
  const flags = new Map<string, HandFlag>();
  for (const report of reports) {
    const finger = REGION_FINGER[report.region];
    if (!finger) {
      continue;
    }
    const key = `${report.side}/${finger}`;
    if (report.pain != null && report.pain <= 0) {
      flags.delete(key);
      continue;
    }
    // A Map keeps the place of a key it already has, so a run keeps its order.
    flags.set(key, {
      side: report.side,
      finger,
      date: flags.get(key)?.date ?? localDate(report.occurred_at),
      spots: report.spots ?? [],
    });
  }
  return [...flags.values()];
}

// Assessments: reach and home tests

export type AssessmentMetric =
  | 'leg_spread'
  | 'height'
  | 'arm_span'
  | 'pullups'
  | 'hang_duration';
export type AssessmentUnit = 'degrees' | 'cm' | 'repetitions' | 'seconds';

export type AssessmentBody = {
  metric: AssessmentMetric;
  value: number;
  unit: AssessmentUnit;
  method: 'manual';
  protocol: string;
  occurred_at: string;
};

export type AssessmentDto = Omit<AssessmentBody, 'method'> & {
  id: string;
  method: 'manual' | 'camera';
};

/**
 * Height and arm span the climber typed in, during setup or on the Tests tab.
 * One protocol for both places, so the server compares them with each other.
 */
export const REACH_PROTOCOL = 'self-measured-v1';

export function reachAssessments(body: Body, at: Date): AssessmentBody[] {
  const typedIn = {
    unit: 'cm',
    method: 'manual',
    protocol: REACH_PROTOCOL,
    occurred_at: at.toISOString(),
  } as const;
  return [
    { metric: 'height', value: body.heightCm, ...typedIn },
    { metric: 'arm_span', value: body.armSpanCm, ...typedIn },
  ];
}

/** The latest height and arm span. Null until both were measured. */
export function reachFromAssessments(
  assessments: readonly AssessmentDto[],
): Reach | null {
  const latest = (metric: AssessmentMetric) =>
    [...assessments]
      .reverse()
      .find(a => a.metric === metric && a.unit === 'cm');
  const height = latest('height');
  const armSpan = latest('arm_span');
  if (!height || !armSpan) {
    return null;
  }
  const newer =
    Date.parse(height.occurred_at) > Date.parse(armSpan.occurred_at)
      ? height
      : armSpan;
  return {
    heightCm: height.value,
    armSpanCm: armSpan.value,
    date: localDate(newer.occurred_at),
  };
}

/** Home tests the server has a metric for. The other four stay on the device. */
const TEST_METRIC: Readonly<
  Partial<
    Record<BaselineTestId, { metric: AssessmentMetric; unit: AssessmentUnit }>
  >
> = {
  'dead-hang': { metric: 'hang_duration', unit: 'seconds' },
  'pull-ups': { metric: 'pullups', unit: 'repetitions' },
};

/** The test as a server assessment, or null when the server has no metric for it. */
export function baselineAssessment(
  result: BaselineResult,
  at: Date,
): AssessmentBody | null {
  const target = TEST_METRIC[result.testId];
  return target
    ? {
        ...target,
        value: result.value,
        method: 'manual',
        protocol: `${result.testId}-v1`,
        occurred_at: at.toISOString(),
      }
    : null;
}

/** What finishing setup sends: the body size as reach, and the mapped tests. */
export function onboardingAssessments(
  result: OnboardingResult,
  at: Date,
): AssessmentBody[] {
  const { body } = result.details;
  return [
    ...(body ? reachAssessments(body, at) : []),
    ...result.baseline.flatMap(test => baselineAssessment(test, at) ?? []),
  ];
}

// Quests

export type QuestDto = {
  id: string;
  /** "paused" means it no longer fits what was logged since. */
  status: 'assigned' | 'paused' | 'completed' | 'skipped';
  /** recovery_checkin, reflect_climb or record_assessment today. */
  kind: string;
  title: string;
  instructions: string;
  reason: string;
  estimated_minutes: number;
  evidence_ids: string[];
};

/** Server quest kinds and the app's closest kind. Unknown kinds show as plan. */
const QUEST_KIND: Readonly<Partial<Record<string, QuestKind>>> = {
  recovery_checkin: 'checkin',
  reflect_climb: 'plan',
  record_assessment: 'assess',
};

export function fromQuestDto(dto: QuestDto): Quest {
  return {
    id: dto.id,
    kind: QUEST_KIND[dto.kind] ?? 'plan',
    title: dto.title,
    task: dto.instructions,
    why: dto.reason,
    minutes: dto.estimated_minutes,
    // Server quests are journal, reflection and measurement tasks.
    equipment: 'None',
    loadsFingers: false,
  };
}

// Everything together

/** Answers of the five requests load() makes, still unchecked. */
export type ServerAnswers = Readonly<{
  climbs: unknown;
  hands: unknown;
  assessments: unknown;
  quests: unknown;
  /** The answer to assignQuest: the current quest. */
  assigned: unknown;
}>;

/** A wrong answer fails loudly instead of showing a blank profile. */
function list<T>(value: unknown, what: string): T[] {
  if (!Array.isArray(value)) {
    throw new BackendError(
      `The server sent ${what} in an unexpected format`,
      200,
    );
  }
  return value as T[];
}

function isQuestDto(value: unknown): value is QuestDto {
  const quest = value as Partial<QuestDto> | null;
  return typeof quest?.id === 'string' && typeof quest.kind === 'string';
}

/**
 * Server records plus device-only data, as the state the app shows. XP comes
 * from the completed quest ids: 10 per quest, like the server's pet.
 */
export function toGameState(
  answers: ServerAnswers,
  device: DeviceData,
): GameState {
  const quests = list<QuestDto>(answers.quests, 'quests');
  const withStatus = (status: QuestDto['status']) =>
    quests.filter(q => q.status === status).map(q => q.id);
  return {
    version: 1,
    logs: list<ClimbDto>(answers.climbs, 'climbs').map(fromClimbDto),
    flags: flagsFromHandReports(list<HandReportDto>(answers.hands, 'hands')),
    completed: withStatus('completed'),
    skipped: withStatus('skipped'),
    reach: reachFromAssessments(
      list<AssessmentDto>(answers.assessments, 'assessments'),
    ),
    onboarding: device.onboarding,
    onboardingSkipped: device.onboardingSkipped,
    baseline: device.baseline,
    assigned: isQuestDto(answers.assigned)
      ? fromQuestDto(answers.assigned)
      : null,
  };
}
