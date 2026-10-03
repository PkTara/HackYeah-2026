/**
 * The JSON the server sends and accepts, and the mapping to app types.
 *
 * PLACEHOLDER: the shapes below are an assumption (snake_case, like many
 * Python and Go APIs). When the real API is known, change these types and
 * the mapping functions. The rest of the app only sees GameState.
 */
import {
  emptyGame,
  type ClimbLog,
  type Finger,
  type GameState,
  type HandFlag,
  type Movement,
  type Reach,
  type Side,
  type Terrain,
} from '@hackyeah/core';
import { BackendError } from './backend';

export type ClimbDto = {
  id: string;
  date: string; // YYYY-MM-DD
  terrain: Terrain;
  movement: Movement;
  grade: string;
  sent: boolean;
};

export type HandFlagDto = { side: Side; finger: Finger; date: string };

export type ReachDto = { arm_span_cm: number; height_cm: number; date: string };

export type ProfileDto = {
  climbs: ClimbDto[];
  hand_flags: HandFlagDto[];
  completed_quest_ids: string[];
  skipped_quest_ids: string[];
  reach: ReachDto | null;
};

export function toClimbDto(log: ClimbLog): ClimbDto {
  const { id, date, terrain, movement, grade, sent } = log;
  return { id, date, terrain, movement, grade, sent };
}

export function fromClimbDto(dto: ClimbDto): ClimbLog {
  const { id, date, terrain, movement, grade, sent } = dto;
  return { id, date, terrain, movement, grade, sent };
}

export function toHandFlagDto(flag: HandFlag): HandFlagDto {
  return { side: flag.side, finger: flag.finger, date: flag.date };
}

export function toReachDto(reach: Reach): ReachDto {
  return {
    arm_span_cm: reach.armSpanCm,
    height_cm: reach.heightCm,
    date: reach.date,
  };
}

/** Checks the basic shape so a wrong answer fails loudly, not as a blank profile. */
export function fromProfileDto(json: unknown): GameState {
  const dto = json as Partial<ProfileDto> | null;
  if (
    !dto ||
    !Array.isArray(dto.climbs) ||
    !Array.isArray(dto.hand_flags) ||
    !Array.isArray(dto.completed_quest_ids)
  ) {
    throw new BackendError('The server sent a profile in an unexpected format', 200);
  }
  return {
    ...emptyGame,
    logs: dto.climbs.map(fromClimbDto),
    flags: dto.hand_flags.map(f => ({ side: f.side, finger: f.finger, date: f.date })),
    completed: dto.completed_quest_ids,
    skipped: dto.skipped_quest_ids ?? [],
    reach: dto.reach
      ? {
          armSpanCm: dto.reach.arm_span_cm,
          heightCm: dto.reach.height_cm,
          date: dto.reach.date,
        }
      : null,
  };
}
