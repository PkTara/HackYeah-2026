import {
  ageLabel,
  markedSpots,
  type Finger,
  type HandFlag,
  type HoldType,
  type LegFlag,
  type LegPart,
  type RunType,
  type Surface,
  type Movement,
  type Side,
  type Spot,
  type SpotLayer,
  type Terrain,
} from '@hackyeah/core';
import type { IconName } from '@hackyeah/ui';

export const TERRAIN_NAME: Record<Terrain, string> = {
  slab: 'Slab',
  vertical: 'Vertical',
  overhang: 'Overhang',
};

export const TERRAIN_ICON: Record<Terrain, IconName> = {
  slab: 'slab',
  vertical: 'vertical',
  overhang: 'overhang',
};

export const MOVEMENT_NAME: Record<Movement, string> = {
  controlled: 'Controlled',
  dynamic: 'Dynamic',
};

/** "controlled", "dynamic" or "controlled and dynamic". */
export function styleText(movements: readonly Movement[]): string {
  return movements.map(m => MOVEMENT_NAME[m].toLowerCase()).join(' and ');
}

export const HOLD_NAME: Record<HoldType, string> = {
  jug: 'Jug',
  crimp: 'Crimp',
  sloper: 'Sloper',
  pinch: 'Pinch',
  pocket: 'Pocket',
  volume: 'Volume',
};

const HOLD_PLURAL: Record<HoldType, string> = {
  jug: 'jugs',
  crimp: 'crimps',
  sloper: 'slopers',
  pinch: 'pinches',
  pocket: 'pockets',
  volume: 'volumes',
};

export const HOLD_ICON: Record<HoldType, IconName> = {
  jug: 'jug',
  crimp: 'crimp',
  sloper: 'sloper',
  pinch: 'pinch',
  pocket: 'pocket',
  volume: 'volume',
};

/** "crimps, slopers", or empty when no hold types were picked. */
export function holdsText(holds: readonly HoldType[]): string {
  return holds.map(h => HOLD_PLURAL[h]).join(', ');
}

export const SIDE_NAME: Record<Side, string> = { left: 'Left', right: 'Right' };

export const FINGER_NAME: Record<Finger, string> = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  little: 'Little',
};

/** "Right ring finger", or "Left thumb". */
export function fingerLabel(side: Side, finger: Finger): string {
  const name = FINGER_NAME[finger].toLowerCase();
  return `${SIDE_NAME[side]} ${finger === 'thumb' ? name : `${name} finger`}`;
}

export const SPOT_LAYER_NAME: Record<SpotLayer, string> = {
  segments: 'Segments',
  pulleys: 'Pulleys',
  tendon: 'Tendon',
};

/** How a sentence names a spot: "A2 pulley", "middle joint". */
function spotWords(spot: Spot): string {
  // Both tendon spots are called "Flexor tendon"; their place tells them apart.
  const words =
    spot.layer === 'tendon' ? `${spot.name} ${spot.detail}` : spot.name;
  // Lower case inside a sentence, but keep codes like "A2" as they are.
  return /^[A-Z][a-z]/.test(words)
    ? words[0].toLowerCase() + words.slice(1)
    : words;
}

/** "middle joint, A2 pulley", or "not sure where" when no spot is marked. */
export function spotsText(finger: Finger, spots: readonly string[]): string {
  const marked = markedSpots(finger, spots);
  return marked.length > 0
    ? marked.map(spotWords).join(', ')
    : 'not sure where';
}

/** "Right ring finger: middle joint, A2 pulley. Flagged today." */
export function flagText(flag: HandFlag, today: string): string {
  const where = spotsText(flag.finger, flag.spots);
  const when = ageLabel(flag.date, today);
  return `${fingerLabel(flag.side, flag.finger)}: ${where}. Flagged ${when}.`;
}

export const GRADES = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'] as const;

// Gazelle mode.

export const RUN_TYPE_NAME: Record<RunType, string> = {
  easy: 'Easy',
  tempo: 'Tempo',
  long: 'Long',
};

export const RUN_TYPE_ICON: Record<RunType, IconName> = {
  easy: 'easy',
  tempo: 'tempo',
  long: 'long',
};

/** One line on what each run type means, for the log form. */
export const RUN_TYPE_HINT: Record<RunType, string> = {
  easy: 'Relaxed, you could chat the whole way.',
  tempo: 'Steady-hard, a few words at a time.',
  long: 'Your longest run of the week, at an easy pace.',
};

export const SURFACE_NAME: Record<Surface, string> = {
  road: 'Road',
  trail: 'Trail',
  track: 'Track',
};

export const SURFACE_ICON: Record<Surface, IconName> = {
  road: 'road',
  trail: 'trail',
  track: 'track',
};

export const LEG_PART_NAME: Record<LegPart, string> = {
  hip: 'Hip',
  knee: 'Knee',
  shin: 'Shin',
  calf: 'Calf',
  ankle: 'Ankle',
  foot: 'Foot',
};

/** "Left knee" */
export function legLabel(side: Side, part: LegPart): string {
  return `${SIDE_NAME[side]} ${LEG_PART_NAME[part].toLowerCase()}`;
}

/** "Left knee. Flagged yesterday." */
export function legFlagText(flag: LegFlag, today: string): string {
  return `${legLabel(flag.side, flag.part)}. Flagged ${ageLabel(flag.date, today)}.`;
}

/** "5 km easy" or "12.5 km long" */
export function runName(run: { km: number; type: RunType }): string {
  return `${run.km} km ${RUN_TYPE_NAME[run.type].toLowerCase()}`;
}

/** Distances offered on the log form, in km. */
export const RUN_DISTANCES = [3, 5, 8, 10, 12, 15, 18, 21.1, 25] as const;
/** Moving times offered on the log form, in minutes. */
export const RUN_MINUTES = [15, 20, 30, 40, 50, 60, 75, 90, 120] as const;
